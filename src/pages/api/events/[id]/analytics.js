import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        // In production, fetch from database
        const analytics = {
            prices: [
                { date: '2024-03-01', price: 150, volume: 100 },
                { date: '2024-03-02', price: 165, volume: 85 },
                { date: '2024-03-03', price: 145, volume: 120 },
                { date: '2024-03-04', price: 180, volume: 50 },
                { date: '2024-03-05', price: 155, volume: 75 }
            ],
            demand: {
                sellOutLikelihood: 0.85,
                bestTimeToBuy: 'Next 24 hours',
                priceDirection: 'increasing',
                confidence: 0.92
            }
        };

        return NextResponse.json(analytics);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load analytics' },
            { status: 500 }
        );
    }
} 