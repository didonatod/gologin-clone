import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        const performance = {
            timeAnalysis: [
                { hour: '00:00', successRate: 85, avgPurchaseTime: 1.8 },
                { hour: '04:00', successRate: 92, avgPurchaseTime: 1.5 },
                { hour: '08:00', successRate: 75, avgPurchaseTime: 2.3 },
                { hour: '12:00', successRate: 65, avgPurchaseTime: 2.8 },
                { hour: '16:00', successRate: 70, avgPurchaseTime: 2.5 },
                { hour: '20:00', successRate: 80, avgPurchaseTime: 2.0 }
            ],
            failureReasons: {
                soldOut: 45,
                error: 12,
                timeout: 76
            },
            mostCommonFailure: 'timeout',
            averageResponseTime: 1.2,
            uptime: 98.5,
            systemLoad: {
                cpu: 45,
                memory: 62,
                network: 38
            }
        };

        return NextResponse.json(performance);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load performance data' },
            { status: 500 }
        );
    }
} 