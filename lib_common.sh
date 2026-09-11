#!/bin/bash
# ===========================================================================
# lib_common.sh — Shared functions for backup and restore
#
# Usage:  source "$(dirname "$0")/lib_common.sh"
# ===========================================================================

# --- Colors (if terminal supports them) ---
if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

log_ok()   { echo -e "${GREEN}✅ $*${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
log_err()  { echo -e "${RED}❌ $*${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $*${NC}"; }

# ---------------------------------------------------------------------------
# find_latest_file DIR PATTERN
#   Returns the most recent file matching the given pattern
# ---------------------------------------------------------------------------
find_latest_file() {
    local search_dir="$1"
    local pattern="$2"
    find "$search_dir" -maxdepth 2 -name "$pattern" -type f 2>/dev/null \
        | xargs ls -t 2>/dev/null | head -n 1
}

# ---------------------------------------------------------------------------
# wait_for_db DB_CONTAINER [PG_SUPERUSER] [MAX_ATTEMPTS]
#   Waits for PostgreSQL to accept real connections (not just pg_isready)
# ---------------------------------------------------------------------------
wait_for_db() {
    local db_container="$1"
    local pg_user="${2:-postgres}"
    local max="${3:-60}"
    echo "Waiting for database to be ready..."
    for i in $(seq 1 "$max"); do
        docker exec "$db_container" pg_isready -U "$pg_user" > /dev/null 2>&1 \
            || { sleep 2; continue; }
        docker exec "$db_container" psql -U "$pg_user" -d postgres -c "SELECT 1" \
            > /dev/null 2>&1 \
            && { log_ok "Database ready."; sleep 3; return 0; }
        [ $((i % 10)) -eq 0 ] && echo "  DB not ready yet (attempt $i/$max)..."
        sleep 2
    done
    log_err "Database not ready after waiting."; exit 1
}

# ---------------------------------------------------------------------------
# grant_db_permissions DB_CONTAINER DB_NAME DB_OWNER [PG_SUPERUSER]
#   Aligns permissions for the application user on a database
# ---------------------------------------------------------------------------
grant_db_permissions() {
    local db_container="$1"
    local db_name="$2"
    local db_owner="$3"
    local pg_user="${4:-postgres}"

    [ -z "$db_owner" ] && { log_warn "Unknown owner for '$db_name'; skipping GRANT."; return; }
    echo "   🔑 GRANT to '$db_owner' on '$db_name'..."
    docker exec "$db_container" psql -U "$pg_user" -d "$db_name" -v ON_ERROR_STOP=1 -c "
        GRANT USAGE, CREATE ON SCHEMA public TO \"$db_owner\";
        GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO \"$db_owner\";
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"$db_owner\";
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO \"$db_owner\";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT ALL ON TABLES    TO \"$db_owner\";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT ALL ON SEQUENCES TO \"$db_owner\";
    " || { log_err "GRANT error on '$db_name'."; exit 1; }
}

# ---------------------------------------------------------------------------
# fix_fixture_fk_violations DB_CONTAINER DB_NAME [PG_SUPERUSER]
#   Cleans up orphan records that prevent fixture loading
# ---------------------------------------------------------------------------
fix_fixture_fk_violations() {
    local db_container="$1"
    local db_name="$2"
    local pg_user="${3:-postgres}"

    echo "   🧹 Cleaning orphan records pre-fixture on '$db_name'..."
    docker exec "$db_container" psql -U "$pg_user" -d "$db_name" -c "
        DELETE FROM upload_resourcehandlerinfo
        WHERE execution_request_id IS NOT NULL
          AND execution_request_id NOT IN (
              SELECT id FROM resource_executionrequest
          );
        DELETE FROM resource_executionrequest
        WHERE id NOT IN (
            SELECT DISTINCT execution_request_id
            FROM upload_resourcehandlerinfo
            WHERE execution_request_id IS NOT NULL
        )
        AND status IN ('finished', 'failed', 'deleted');
    " 2>/dev/null || true
    log_ok "Orphan cleanup completed."
}

# ---------------------------------------------------------------------------
# prepare_db DB_CONTAINER DB_NAME DB_OWNER [PG_SUPERUSER]
#   Drop + recreate + postgis + schema permissions for a single database
# ---------------------------------------------------------------------------
prepare_db() {
    local db_container="$1"
    local db_name="$2"
    local db_owner="$3"
    local pg_user="${4:-postgres}"

    echo "--- '$db_name' (owner: $db_owner) ---"
    docker exec "$db_container" dropdb --if-exists -U "$pg_user" "$db_name"

    for attempt in 1 2 3; do
        docker exec "$db_container" createdb -U "$pg_user" "$db_name" && break
        echo "  Retry createdb '$db_name' (attempt $attempt/3)..."
        sleep 3
    done || { log_err "Error creating '$db_name'."; exit 1; }

    docker exec "$db_container" psql -U "$pg_user" -v ON_ERROR_STOP=1 \
        -c "ALTER DATABASE \"$db_name\" OWNER TO \"$db_owner\";"
    docker exec "$db_container" psql -U "$pg_user" -d "$db_name" -v ON_ERROR_STOP=1 \
        -c "CREATE EXTENSION IF NOT EXISTS postgis;" \
        || { log_err "CREATE EXTENSION postgis error on '$db_name'."; exit 1; }

    for attempt in 1 2 3; do
        docker exec "$db_container" psql -U "$pg_user" -d "$db_name" \
            -v ON_ERROR_STOP=1 -c "
            ALTER SCHEMA public OWNER TO \"$db_owner\";
            GRANT ALL ON SCHEMA public TO \"$db_owner\";
            GRANT CREATE ON SCHEMA public TO \"$db_owner\";
        " && break
        echo "  Retry schema permissions '$db_name' (attempt $attempt/3)..."
        sleep 3
    done || { log_err "Error assigning schema permissions for '$db_name'."; exit 1; }
}

# ---------------------------------------------------------------------------
# restore_pg_dump DB_CONTAINER DUMP_FILE DB_NAME [PG_SUPERUSER]
#   Copies a dump into the container and restores it with pg_restore
# ---------------------------------------------------------------------------
restore_pg_dump() {
    local db_container="$1"
    local dump_file="$2"
    local db_name="$3"
    local pg_user="${4:-postgres}"
    local tmp_name="/tmp/$(basename "$dump_file")"

    docker cp "$dump_file" "${db_container}:${tmp_name}"
    docker exec "$db_container" pg_restore -U "$pg_user" \
        --no-owner --no-privileges \
        -d "$db_name" "$tmp_name"
    local exit_code=$?
    docker exec "$db_container" rm -f "$tmp_name"

    if [ $exit_code -gt 1 ]; then
        log_err "Critical pg_restore error on '$db_name' (exit $exit_code)."
        exit 1
    fi
    [ $exit_code -eq 1 ] && log_warn "pg_restore '$db_name': non-critical warnings (exit 1)."
    return 0
}

# ---------------------------------------------------------------------------
# apply_manage_restore COMPOSE_CMD DJANGO_CONTAINER BACKUP_ZIP CONFIG_PATH
#   Runs manage.py restore with the curs.close() bug patch
# ---------------------------------------------------------------------------
apply_manage_restore() {
    local compose_cmd="$1"
    local django_container="$2"
    local backup_zip="$3"
    local config_path="$4"
    local backup_filename
    backup_filename=$(basename "$backup_zip")

    echo "Copying backup to Django container..."
    docker exec "$django_container" mkdir -p /backup_restore 2>/dev/null || true
    docker cp "$backup_zip" "${django_container}:/backup_restore/${backup_filename}" \
        || { log_err "Unable to copy backup to Django container."; exit 1; }

    echo "Running manage.py restore (with curs.close() bug patch)..."
    $compose_cmd run --rm --entrypoint "" \
        -e BACKUP_FILE="/backup_restore/${backup_filename}" \
        -e BR_CONFIG="$config_path" \
        django bash -c '
python3 << "PYEOF"
p = "/usr/src/venv/lib/python3.12/site-packages/geonode/br/management/commands/utils/utils.py"
with open(p) as f:
    c = f.read()
old = "    curs.close()\n    conn.close()\n\n\ndef confirm"
new = "    try:\n        curs.close()\n    except Exception:\n        pass\n    conn.close()\n\n\ndef confirm"
if old in c:
    c = c.replace(old, new, 1)
    with open(p, "w") as f:
        f.write(c)
    print("[patch] Patched remove_existing_tables in", p)
else:
    print("[patch] Pattern not found or already patched")
PYEOF
python manage.py restore --force --backup-file="$BACKUP_FILE" --config="$BR_CONFIG"
'
    local exit_code=$?
    docker exec "$django_container" rm -f "/backup_restore/${backup_filename}" 2>/dev/null || true
    return $exit_code
}

# ---------------------------------------------------------------------------
# wait_for_geoserver GEOSERVER_CONTAINER [MAX_ATTEMPTS]
#   Waits for GeoServer to respond (HTTP 200/302/401/403)
# ---------------------------------------------------------------------------
wait_for_geoserver() {
    local gs_container="$1"
    local max="${2:-90}"
    echo "Waiting for GeoServer to be ready (max ~$((max * 2 / 60)) min)..."
    for i in $(seq 1 "$max"); do
        HTTP_STATUS=$(docker exec "$gs_container" \
            wget -q --server-response --spider \
            http://localhost:8080/geoserver/web/ 2>&1 \
            | awk '/HTTP\//{print $2}' | tail -n 1)
        case "$HTTP_STATUS" in
            200|302|401|403) log_ok "GeoServer ready."; return 0;;
        esac
        sleep 2
    done
    log_err "GeoServer not ready after waiting."
    return 1
}

# ---------------------------------------------------------------------------
# fix_geoserver_styles_after_startup GEOSERVER_CONTAINER
#
# Runs the full GeoServer styles fix AFTER the environment has started.
# 1) Backup SLD and remove corrupted XML (avoids "should have workspace X" bug)
# 2) Reload GeoServer catalog
# 3) Register styles via REST API
# 4) Fix layer→style associations
#
# Uses only the GeoServer container (which has curl, sh). No stop/restart needed.
# ---------------------------------------------------------------------------
fix_geoserver_styles_after_startup() {
    local gs_container="$1"

    echo "🎨 GeoServer styles fix (after environment startup)..."

    # Wait for GeoServer to be ready
    local gs_ready=0
    for i in $(seq 1 90); do
        local code
        code=$(docker exec "$gs_container" sh -c \
            "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/geoserver/web/" 2>/dev/null)
        case "$code" in 200|302|401|403) gs_ready=1; break;; esac
        sleep 2
    done
    if [ "$gs_ready" -ne 1 ]; then
        log_warn "GeoServer not ready — skipping styles fix."
        return 1
    fi

    # Step 1: Backup SLD and remove corrupted XML (use sh, not bash)
    local sld_count
    sld_count=$(docker exec "$gs_container" sh -c '
        STYLES_DIR="/geoserver_data/data/workspaces/geonode/styles"
        BACKUP_DIR="/geoserver_data/data/.sld_backup"
        [ ! -d "$STYLES_DIR" ] && echo 0 && exit 0
        rm -rf "$BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        for f in "$STYLES_DIR"/*.sld; do [ -f "$f" ] && cp "$f" "$BACKUP_DIR/"; done
        rm -f "$STYLES_DIR"/*.xml "$STYLES_DIR"/*.sld 2>/dev/null
        ls "$BACKUP_DIR" 2>/dev/null | grep "\.sld$" | wc -l
    ' 2>/dev/null | tr -d ' ')

    if [ "${sld_count:-0}" -eq 0 ]; then
        # Try .sld_backup if already populated from previous run
        sld_count=$(docker exec "$gs_container" sh -c \
            'ls /geoserver_data/data/.sld_backup/ 2>/dev/null | grep "\.sld$" | wc -l' 2>/dev/null | tr -d ' ')
    fi

    if [ "${sld_count:-0}" -eq 0 ]; then
        log_warn "No SLD files found — skipping styles fix."
        return 0
    fi

    echo "   SLD to register: $sld_count"

    # Step 2: Reload GeoServer catalog
    docker exec "$gs_container" sh -c \
        'curl -s -u admin:admin -X PUT "http://localhost:8080/geoserver/rest/reload"' >/dev/null 2>&1
    sleep 5

    # Step 3: Register styles via REST API
    local sld_dir="/geoserver_data/data/.sld_backup"
    local sld_list
    sld_list=$(docker exec "$gs_container" ls "$sld_dir/" 2>/dev/null | grep '\.sld$')
    local style_ok=0 style_fail=0

    for sld_file in $sld_list; do
        local style_name="${sld_file%.sld}"
        local http
        http=$(docker exec "$gs_container" sh -c "
            curl -s -o /dev/null -w '%{http_code}' -u admin:admin \
                -X POST 'http://localhost:8080/geoserver/rest/workspaces/geonode/styles?name=${style_name}' \
                -H 'Content-Type: application/vnd.ogc.sld+xml' \
                -d @${sld_dir}/${sld_file}
        " 2>/dev/null)

        if [ "$http" = "201" ]; then
            docker exec "$gs_container" sh -c "
                curl -s -o /dev/null -u admin:admin \
                    -X PUT 'http://localhost:8080/geoserver/rest/workspaces/geonode/styles/${style_name}' \
                    -H 'Content-Type: application/vnd.ogc.sld+xml' \
                    -d @${sld_dir}/${sld_file}
            " 2>/dev/null
            style_ok=$((style_ok + 1))
        elif [ "$http" = "403" ] || [ "$http" = "409" ]; then
            docker exec "$gs_container" sh -c "
                curl -s -o /dev/null -u admin:admin \
                    -X PUT 'http://localhost:8080/geoserver/rest/workspaces/geonode/styles/${style_name}' \
                    -H 'Content-Type: application/vnd.ogc.sld+xml' \
                    -d @${sld_dir}/${sld_file}
            " 2>/dev/null
            style_ok=$((style_ok + 1))
        else
            echo "      ⚠️  $style_name: HTTP $http"
            style_fail=$((style_fail + 1))
        fi
    done
    log_ok "Styles registered: $style_ok, failed: $style_fail"

    # Step 4: Fix layer → style associations
    echo "   Fixing layer → style associations..."
    local layers
    layers=$(docker exec "$gs_container" sh -c '
        curl -s -u admin:admin "http://localhost:8080/geoserver/rest/workspaces/geonode/layers.json" \
            | python3 -c "
import json,sys
data = json.load(sys.stdin)
for l in data.get(\"layers\",{}).get(\"layer\",[]):
    print(l[\"name\"])
" 2>/dev/null
    ' 2>/dev/null)

    local fixed=0
    for layer in $layers; do
        local style_ref
        style_ref=$(docker exec "$gs_container" sh -c "
            LAYER_XML=\$(find /geoserver_data/data/workspaces/geonode -path \"*/${layer}/layer.xml\" 2>/dev/null | head -1)
            [ -z \"\$LAYER_XML\" ] && exit 0
            grep -A1 '<defaultStyle>' \"\$LAYER_XML\" | grep '<name>' | sed 's/.*<name>//;s/<\/name>.*//' | tr -d ' '
        " 2>/dev/null)
        [ -z "$style_ref" ] && continue

        local style_ws style_name
        style_ws=$(echo "$style_ref" | cut -d: -f1)
        style_name=$(echo "$style_ref" | cut -d: -f2)

        local is_broken
        is_broken=$(docker exec "$gs_container" sh -c "
            curl -s -u admin:admin 'http://localhost:8080/geoserver/rest/workspaces/geonode/layers/${layer}.json' 2>&1 | head -1
        " 2>/dev/null)

        if echo "$is_broken" | grep -q "Unable to marshal"; then
            docker exec "$gs_container" sh -c "
                curl -s -o /dev/null -u admin:admin \
                    -X PUT 'http://localhost:8080/geoserver/rest/workspaces/geonode/layers/${layer}' \
                    -H 'Content-Type: application/json' \
                    -d '{\"layer\":{\"defaultStyle\":{\"name\":\"${style_name}\",\"workspace\":\"${style_ws}\"}}}'
            " 2>/dev/null
            fixed=$((fixed + 1))
        fi
    done
    [ $fixed -gt 0 ] && log_ok "Fixed style associations for $fixed layers."
    [ $fixed -eq 0 ] && log_ok "All layer→style associations already correct."
}

# ---------------------------------------------------------------------------
# inject_geoserver_datastores GEOSERVER_CONTAINER DATASTORES_ARCHIVE [DB_MAP]
#
# Injects datastore.xml into the GeoServer environment, substituting DB names
# if needed. DB_MAP is a string with substitutions:
#   "my_geo_data:test_my_geo_data my_geo:test_my_geo backoffice:test_backoffice"
# If empty, no substitution is performed (production restore).
# ---------------------------------------------------------------------------
inject_geoserver_datastores() {
    local gs_container="$1"
    local datastores_archive="$2"
    local db_map="$3"

    echo "💉 Injecting GeoServer datastores..."

    if [ -z "$datastores_archive" ] || [ ! -f "$datastores_archive" ]; then
        log_warn "No datastore archive found. Skipping injection."
        return 0
    fi

    local tmp_dir="/tmp/geoserver_datastores_$$"
    rm -rf "$tmp_dir" && mkdir -p "$tmp_dir"

    tar -xzf "$datastores_archive" -C "$tmp_dir" 2>/dev/null \
        || { log_err "Error extracting datastores archive."; rm -rf "$tmp_dir"; return 1; }

    # DB name substitutions (if requested)
    if [ -n "$db_map" ]; then
        echo "   🔧 Substituting DB names in datastore.xml..."
        find "$tmp_dir" -name "datastore.xml" | while read f; do
            for mapping in $db_map; do
                local src="${mapping%%:*}"
                local dst="${mapping#*:}"
                if sed --version >/dev/null 2>&1; then
                    sed -i "s|<entry key=\"database\">${src}</entry>|<entry key=\"database\">${dst}</entry>|g" "$f"
                else
                    sed -i '' "s|<entry key=\"database\">${src}</entry>|<entry key=\"database\">${dst}</entry>|g" "$f"
                fi
            done
        done
    fi

    # Copy to container
    find "$tmp_dir" -name "datastore.xml" | while read f; do
        local rel_path="${f#$tmp_dir/}"
        local dest_dir="/geoserver_data/data/$(dirname "$rel_path")"
        docker exec "$gs_container" mkdir -p "$dest_dir" 2>/dev/null || true
        docker cp "$f" "${gs_container}:${dest_dir}/datastore.xml"
    done

    local ds_total
    ds_total=$(find "$tmp_dir" -name "datastore.xml" | wc -l | tr -d ' ')
    log_ok "$ds_total datastore.xml injected."
    rm -rf "$tmp_dir"
}
