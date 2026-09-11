import React, { useCallback, useEffect, useRef, useContext } from 'react';
import { classNames, DomHandler } from 'primereact/utils';
import { useRouter } from 'next/router';
import { LayoutContext } from './context/layoutcontext';
import { useEventListener, useMountEffect, useResizeListener, useUnmountEffect } from 'primereact/hooks';
import AppTopbar from './AppTopbar';
import AppFooter from './AppFooter';
import AppConfig from './AppConfig';
import AppSearch from './AppSearch';
import AppBreadCrumb from './AppBreadCrumb';
import PrimeReact from 'primereact/api';
import { Tooltip } from 'primereact/tooltip';
import { Toast } from 'primereact/toast';

const Layout = (props) => {
    const { layoutConfig, layoutState, setLayoutState, isSlim, isCompact, isHorizontal, isDesktop } = useContext(LayoutContext);
    const topbarRef = useRef(null);
    const sidebarRef = useRef(null);
    const copyTooltipRef = useRef(null);
    const toastRef = useRef(null);
    const router = useRouter();
    const [bindMenuOutsideClickListener, unbindMenuOutsideClickListener] = useEventListener({
        type: 'click',
        listener: (event) => {
            const isOutsideClicked = !(sidebarRef.current.isSameNode(event.target) || sidebarRef.current.contains(event.target) || topbarRef.current.menubutton.isSameNode(event.target) || topbarRef.current.menubutton.contains(event.target));

            if (isOutsideClicked) {
                hideMenu();
            }
        }
    });

    const [bindDocumentResizeListener, unbindDocumentResizeListener] = useResizeListener({
        listener: () => {
            if (isDesktop() && !DomHandler.isTouchDevice()) {
                hideMenu();
            }
        }
    });
    
    const hideMenu = useCallback(() => {
        setLayoutState((prevLayoutState) => ({
            ...prevLayoutState,
            overlayMenuActive: false,
            overlaySubmenuActive: false,
            staticMenuMobileActive: false,
            menuHoverActive: false,
            menuClick: false,
            resetMenu: (isSlim() || isCompact() || isHorizontal()) && isDesktop()
        }));
    }, [isSlim, isHorizontal, isDesktop, setLayoutState]); // eslint-disable-line

    const blockBodyScroll = () => {
        DomHandler.addClass('blocked-scroll');
    };

    const unblockBodyScroll = () => {
        DomHandler.removeClass('blocked-scroll');
    };

    useMountEffect(() => {
        PrimeReact.ripple = true;
    });

    useEffect(() => {
        if (layoutState.overlayMenuActive || layoutState.staticMenuMobileActive || layoutState.overlaySubmenuActive) {
            bindMenuOutsideClickListener();
        }

        if (layoutState.staticMenuMobileActive) {
            blockBodyScroll();
            (isSlim() || isCompact() || isHorizontal()) && bindDocumentResizeListener();
        }

        return () => {
            unbindMenuOutsideClickListener();
            unbindDocumentResizeListener();
            unblockBodyScroll();
        };
    }, [layoutState.overlayMenuActive, layoutState.staticMenuMobileActive, layoutState.overlaySubmenuActive]); // eslint-disable-line

    useEffect(() => {
        const onRouteChange = () => {
            hideMenu();
        };
        router.events.on('routeChangeComplete', onRouteChange);
        return () => {
            router.events.off('routeChangeComplete', onRouteChange);
        };
    }, [router, hideMenu]); // eslint-disable-line

    useUnmountEffect(() => {
        unbindMenuOutsideClickListener();
    });

    const containerClassName = classNames(
        'layout-wrapper',
        {
            'layout-static': layoutConfig.menuMode === 'static',
            'layout-slim': layoutConfig.menuMode === 'slim',
            'layout-horizontal': layoutConfig.menuMode === 'horizontal',
            'layout-drawer': layoutConfig.menuMode === 'drawer',
            'layout-overlay': layoutConfig.menuMode === 'overlay',
            'layout-compact': layoutConfig.menuMode === 'compact',
            'layout-reveal': layoutConfig.menuMode === 'reveal',
            'layout-sidebar-dim': layoutConfig.colorScheme === 'dim',
            'layout-sidebar-dark': layoutConfig.colorScheme === 'dark',
            'layout-overlay-active': layoutState.overlayMenuActive,
            'layout-mobile-active': layoutState.staticMenuMobileActive,
            'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
            'p-input-filled': layoutConfig.inputStyle === 'filled',
            'p-ripple-disabled': !layoutConfig.ripple,
            'layout-sidebar-active': layoutState.sidebarActive,
            'layout-sidebar-anchored': layoutState.anchored
        },
        layoutConfig.colorScheme === 'light' ? 'layout-sidebar-' + layoutConfig.menuTheme : ''
    );

    return (
        <div className={containerClassName} data-theme={layoutConfig.colorScheme}>
            <Tooltip ref={copyTooltipRef} target=".block-action-copy" position="bottom" content="Copied to clipboard" event="focus" />
            <Toast ref={toastRef} position="top-right" />
            <div className="layout-content-wrapper">
                <AppTopbar ref={topbarRef} sidebarRef={sidebarRef} />
                <div className="layout-content">
                    <AppBreadCrumb />

                    {props.children}
                </div>
                <AppFooter />
            </div>
            <AppConfig />

            <AppSearch />
            <div className="layout-mask"></div>
        </div>
    );
};

export default Layout;
