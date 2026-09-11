import React, { useContext } from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';



const Custom500 = () => {
    const t = useTranslations('default');
    return (
        <div className="px-5 min-h-screen flex justify-content-center align-items-center bg-cover bg-center" style={{ backgroundImage: 'url(/plan4ldn/img/bg-error.jpg)' }}>
            <div className="z-1 text-center">
                <div className="text-900 font-bold text-white text-8xl mb-4">System Error</div>
                <p className="line-height-3 text-white mt-0 mb-5 text-700 text-xl font-medium">Some went wrong.</p>
                <Link href="/"> Go to PLAN4LDN home </Link>
            </div>
        </div>
    )
};

Custom500.getLayout = function getLayout(page) {
    return page;
};

export async function getStaticProps(context) {
    return {
      props: { 
        messages: (await import(`../translations/${context.locale}.json`)).default
       },
    }
}

export default Custom500;
