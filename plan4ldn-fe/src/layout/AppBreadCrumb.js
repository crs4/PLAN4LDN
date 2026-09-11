import { useRouter } from 'next/router';
import { ObjectUtils } from 'primereact/utils';
import React, { useContext, useEffect, useState } from 'react';
import { LayoutContext } from './context/layoutcontext';

const AppBreadcrumb = () => {
    const router = useRouter();
    const [breadcrumb, setBreadcrumb] = useState({});
    const { breadcrumbs } = useContext(LayoutContext);

    useEffect(() => {
        const filteredBreadcrumbs = breadcrumbs?.find((crumb) => {
            const lastPathSegment = crumb.to.split('/').pop();
            const lastRouterSegment = router.pathname.split('/').pop();

            if (lastRouterSegment?.startsWith('[') && !isNaN(Number(lastPathSegment))) {
                return router.pathname.split('/').slice(0, -1).join('/') === crumb.to?.split('/').slice(0, -1).join('/');
            }
            return crumb.to === router.pathname;
        });

        setBreadcrumb(filteredBreadcrumbs);
    }, [router, breadcrumbs]); // eslint-disable-line

    return (
        <nav className="layout-breadcrumb">
            <ol>
                {ObjectUtils.isNotEmpty(breadcrumb)
                    ? breadcrumb.labels.map((label, index) => {
                          return (
                              <React.Fragment key={index}>
                                  {index !== 0 && <li className="layout-breadcrumb-chevron"> / </li>}
                                  <li key={index}>{label}</li>
                              </React.Fragment>
                          );
                      })
                    : null}
            </ol>
        </nav>
    );
};

export default AppBreadcrumb;
