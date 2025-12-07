import { NextResponse } from 'next/server';

export async function GET() {
    // Return geo-pricing data (fallback to India pricing)
    const pricing = {
        country: 'India',
        currency: 'INR',
        symbol: '₹',
        monthly: {
            amount: 499,
            display: '₹499',
            usd: 5.99
        },
        yearly: {
            amount: 3999,
            display: '₹3,999',
            usd: 47.88,
            savings: '33%'
        }
    };

    return NextResponse.json({ pricing });
}
