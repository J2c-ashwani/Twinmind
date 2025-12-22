/**
 * Geo-Based Pricing Service
 * Competitive pricing for different markets based on purchasing power parity
 */

export const PRICING_TIERS = {
    // India & South Asia (Low purchasing power)
    IN: { currency: 'INR', symbol: '₹', monthly: 299, yearly: 2999, usd: 3.60 },
    PK: { currency: 'PKR', symbol: 'Rs', monthly: 999, yearly: 9999, usd: 3.50 },
    BD: { currency: 'BDT', symbol: '৳', monthly: 399, yearly: 3999, usd: 3.60 },
    LK: { currency: 'LKR', symbol: 'Rs', monthly: 1199, yearly: 11999, usd: 3.70 },
    NP: { currency: 'NPR', symbol: 'Rs', monthly: 499, yearly: 4999, usd: 3.75 },

    // Southeast Asia
    ID: { currency: 'IDR', symbol: 'Rp', monthly: 69000, yearly: 690000, usd: 4.50 },
    VN: { currency: 'VND', symbol: '₫', monthly: 119000, yearly: 1190000, usd: 4.80 },
    PH: { currency: 'PHP', symbol: '₱', monthly: 249, yearly: 2490, usd: 4.50 },
    TH: { currency: 'THB', symbol: '฿', monthly: 169, yearly: 1690, usd: 4.80 },
    MY: { currency: 'MYR', symbol: 'RM', monthly: 22, yearly: 220, usd: 4.90 },
    SG: { currency: 'SGD', symbol: 'S$', monthly: 9.90, yearly: 99, usd: 7.30 },

    // Latin America
    BR: { currency: 'BRL', symbol: 'R$', monthly: 29.90, yearly: 299, usd: 5.99 },
    MX: { currency: 'MXN', symbol: '$', monthly: 99, yearly: 990, usd: 5.80 },
    AR: { currency: 'ARS', symbol: '$', monthly: 4999, yearly: 49999, usd: 5.50 },
    CO: { currency: 'COP', symbol: '$', monthly: 24900, yearly: 249000, usd: 5.90 },
    CL: { currency: 'CLP', symbol: '$', monthly: 4990, yearly: 49900, usd: 5.70 },

    // Africa
    NG: { currency: 'NGN', symbol: '₦', monthly: 2999, yearly: 29990, usd: 3.99 },
    ZA: { currency: 'ZAR', symbol: 'R', monthly: 99, yearly: 990, usd: 5.50 },
    KE: { currency: 'KES', symbol: 'KSh', monthly: 599, yearly: 5990, usd: 4.20 },
    EG: { currency: 'EGP', symbol: 'E£', monthly: 149, yearly: 1490, usd: 4.80 },

    // Middle East
    AE: { currency: 'AED', symbol: 'د.إ', monthly: 29, yearly: 290, usd: 7.90 },
    SA: { currency: 'SAR', symbol: 'ر.س', monthly: 29, yearly: 290, usd: 7.70 },
    TR: { currency: 'TRY', symbol: '₺', monthly: 199, yearly: 1990, usd: 5.99 },

    // Europe
    GB: { currency: 'GBP', symbol: '£', monthly: 7.99, yearly: 79.99, usd: 10.10 },
    DE: { currency: 'EUR', symbol: '€', monthly: 8.99, yearly: 89.99, usd: 9.50 },
    FR: { currency: 'EUR', symbol: '€', monthly: 8.99, yearly: 89.99, usd: 9.50 },
    IT: { currency: 'EUR', symbol: '€', monthly: 8.99, yearly: 89.99, usd: 9.50 },
    ES: { currency: 'EUR', symbol: '€', monthly: 8.99, yearly: 89.99, usd: 9.50 },
    NL: { currency: 'EUR', symbol: '€', monthly: 8.99, yearly: 89.99, usd: 9.50 },
    PL: { currency: 'PLN', symbol: 'zł', monthly: 34.99, yearly: 349.99, usd: 8.50 },
    RU: { currency: 'RUB', symbol: '₽', monthly: 599, yearly: 5990, usd: 6.50 },

    // North America
    US: { currency: 'USD', symbol: '$', monthly: 9.99, yearly: 99.99, usd: 9.99 },
    CA: { currency: 'CAD', symbol: 'C$', monthly: 12.99, yearly: 129.99, usd: 9.60 },

    // East Asia
    CN: { currency: 'CNY', symbol: '¥', monthly: 49, yearly: 490, usd: 6.90 },
    JP: { currency: 'JPY', symbol: '¥', monthly: 1200, yearly: 12000, usd: 8.00 },
    KR: { currency: 'KRW', symbol: '₩', monthly: 9900, yearly: 99000, usd: 7.50 },

    // Australia & Oceania
    AU: { currency: 'AUD', symbol: 'A$', monthly: 14.99, yearly: 149.99, usd: 9.80 },
    NZ: { currency: 'NZD', symbol: 'NZ$', monthly: 15.99, yearly: 159.99, usd: 9.70 },

    // Default (Rest of World)
    DEFAULT: { currency: 'USD', symbol: '$', monthly: 6.99, yearly: 69.99, usd: 6.99 },
};

/**
 * Get pricing for a country
 */
function getPricingForCountry(countryCode) {
    const code = countryCode?.toUpperCase();
    return PRICING_TIERS[code] || PRICING_TIERS.DEFAULT;
}

/**
 * Detect country from request
 */
function detectCountryFromRequest(req) {
    // Priority order for country detection

    // 1. From header (Cloudflare, Vercel, etc.)
    const cfCountry = req.headers['cf-ipcountry'];
    if (cfCountry && cfCountry !== 'XX') return cfCountry;

    const vercelCountry = req.headers['x-vercel-ip-country'];
    if (vercelCountry) return vercelCountry;

    // 2. From user settings (if logged in)
    if (req.user?.country) return req.user.country;

    // 3. From IP geolocation service (implement if needed)
    // const ipCountry = await getCountryFromIP(req.ip);

    // 4. Default
    return null;
}

/**
 * Get pricing for request
 */
function getPricingForRequest(req) {
    const countryCode = detectCountryFromRequest(req);
    const pricing = getPricingForCountry(countryCode);

    return {
        country: countryCode || 'DEFAULT',
        ...pricing,
        monthlyDisplay: `${pricing.symbol}${pricing.monthly}`,
        yearlyDisplay: `${pricing.symbol}${pricing.yearly}`,
        yearlySavings: Math.round(((pricing.monthly * 12 - pricing.yearly) / (pricing.monthly * 12)) * 100),
    };
}

/**
 * Get all available pricing tiers
 */
function getAllPricingTiers() {
    return Object.entries(PRICING_TIERS).map(([code, pricing]) => ({
        country: code,
        ...pricing,
    }));
}

/**
 * Validate pricing based on country
 */
function validatePricing(amount, currency, countryCode) {
    const pricing = getPricingForCountry(countryCode);

    // Check if amount matches monthly or yearly
    if (amount === pricing.monthly || amount === pricing.yearly) {
        return {
            valid: true,
            tier: amount === pricing.monthly ? 'monthly' : 'yearly',
            pricing,
        };
    }

    return {
        valid: false,
        error: 'Invalid pricing amount for your region',
    };
}

/**
 * Get Stripe price ID based on country and tier
 */
function getStripePriceId(countryCode, tier = 'monthly') {
    const pricing = getPricingForCountry(countryCode);

    // Format: price_<country>_<tier>
    // e.g., price_IN_monthly, price_US_yearly
    return `price_${countryCode}_${tier}`.toLowerCase();
}

export {
    getPricingForCountry,
    detectCountryFromRequest,
    getPricingForRequest,
    getAllPricingTiers,
    validatePricing,
    getStripePriceId,
};
