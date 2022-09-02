// Imports
// ========================================================
import type { NextPage, GetServerSidePropsContext } from 'next';
import * as React from 'react';


// Main Page Component
// ========================================================
const Gated: NextPage<{ json: { address?: string } }> = ({ json }) => {
    return <div>
        <h1>You have access!</h1>
    </div>
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
    // Retrieve cookie
    const req = context.req;

    // Pass cookie
    const res = await fetch(`http://${context.req.headers.host}/api/me`, {
        credentials: 'include',
        headers: {
            cookie: `siwe=${req?.cookies?.siwe ?? ''}`
        }
    });
    const json = await res.json();

    // If address isn't returned redirect to forbidden page
    if (!json?.address) {
        return {
            redirect: {
                permanent: false,
                destination: `/forbidden`
            },
        }
    }

    return {
        props: {
            json
        }, // will be passed to the page component as props
    }
};


// Exports
// ========================================================
export default Gated;