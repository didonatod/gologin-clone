import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        // In production, fetch from database
        const sections = {
            sectionPrices: [
                { section: 'A1', price: 150, availability: 45 },
                { section: 'A2', price: 165, availability: 32 },
                { section: 'B1', price: 120, availability: 78 },
                { section: 'B2', price: 135, availability: 56 },
                { section: 'C1', price: 95, availability: 89 }
            ],
            successRate: 75,
            popularSections: ['A1', 'B2'],
            priceRange: {
                min: 95,
                max: 165,
                average: 133
            }
        };

        return NextResponse.json(sections);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load section data' },
            { status: 500 }
        );
    }
} 