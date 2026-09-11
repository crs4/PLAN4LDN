import React, { useState } from 'react';

import { useContext, useEffect } from 'react';

import { LayoutContext } from './context/layoutcontext';

const AppFooter = () => {
    const { layoutConfig } = useContext(LayoutContext);

    return (
        <div className="layout-footer">
            <div className="flex align-items-center">
                <span className="ml-2 font-bold vertical-align-middle text-2xl text-gray-500">PLAN4LDN Tool</span>
            </div>
            <span className="footer-copyright">&#169; CRS4, UNISS - 2025</span>
        </div>
    );
};

export default AppFooter;
