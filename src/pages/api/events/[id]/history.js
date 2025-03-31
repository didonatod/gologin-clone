import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        // In production, fetch from database
        const history = [
            {
                date: new Date().toISOString(),
                minPrice: 50,
                maxPrice: 200,
                available: 100
            },
            // Add more historical data...
        ];

        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load history' },
            { status: 500 }
        );
    }
} 