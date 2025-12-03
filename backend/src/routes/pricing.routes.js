const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { getPricingForRequest, getAllPricingTiers } = require('../services/geoPricingService');

const router = express.Router();

/**
 * GET /api/pricing
 * Get pricing for user's location
 */
router.get('/', async (req, res) => {
    try {
        const pricing = getPricingForRequest(req);

        res.json({
            success: true,
            pricing: {
                country: pricing.country,
                currency: pricing.currency,
                symbol: pricing.symbol,
                monthly: {
                    amount: pricing.monthly,
                    display: pricing.monthlyDisplay,
                    usd: pricing.usd,
                },
                yearly: {
                    amount: pricing.yearly,
                    display: pricing.yearlyDisplay,
                    usd: pricing.usd * 10, // Approximate yearly USD
                    savings: `${pricing.yearlySavings}%`,
                },
            },
        });
    } catch (error) {
        console.error('Error getting pricing:', error);
        res.status(500).json({ error: 'Failed to get pricing' });
    }
});

/**
 * GET /api/pricing/all
 * Get all pricing tiers (for admin/debug)
 */
router.get('/all', authenticateUser, async (req, res) => {
    try {
        const tiers = getAllPricingTiers();
        res.json({ success: true, tiers });
    } catch (error) {
        console.error('Error getting all pricing:', error);
        res.status(500).json({ error: 'Failed to get pricing tiers' });
    }
});

/**
 * GET /api/pricing/compare
 * Compare pricing across regions
 */
router.get('/compare', async (req, res) => {
    try {
        const tiers = getAllPricingTiers();

        // Group by region
        const regions = {
            'South Asia': tiers.filter(t => ['IN', 'PK', 'BD', 'LK', 'NP'].includes(t.country)),
            'Southeast Asia': tiers.filter(t => ['ID', 'VN', 'PH', 'TH', 'MY', 'SG'].includes(t.country)),
            'Latin America': tiers.filter(t => ['BR', 'MX', 'AR', 'CO', 'CL'].includes(t.country)),
            'Africa': tiers.filter(t => ['NG', 'ZA', 'KE', 'EG'].includes(t.country)),
            'Middle East': tiers.filter(t => ['AE', 'SA', 'TR'].includes(t.country)),
            'Europe': tiers.filter(t => ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'RU'].includes(t.country)),
            'North America': tiers.filter(t => ['US', 'CA'].includes(t.country)),
            'East Asia': tiers.filter(t => ['CN', 'JP', 'KR'].includes(t.country)),
            'Oceania': tiers.filter(t => ['AU', 'NZ'].includes(t.country)),
        };

        res.json({ success: true, regions });
    } catch (error) {
        console.error('Error comparing pricing:', error);
        res.status(500).json({ error: 'Failed to compare pricing' });
    }
});

module.exports = router;
