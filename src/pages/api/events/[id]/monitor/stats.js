import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        // In production, fetch from database
        const stats = {
            totalAttempts: 156,
            successfulPurchases: 23,
            averagePurchaseTime: 2.3, // seconds
            failureReasons: {
                soldOut: 45,
                error: 12,
                timeout: 76
            },
            lastCheck: new Date().toISOString(),
            uptime: 98.5, // percentage
            averageResponseTime: 1.2 // seconds
        };

        return NextResponse.json(stats);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load monitor stats' },
            { status: 500 }
        );
    }
} 