import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        const optimization = {
            recommendedSettings: {
                checkInterval: 2.5,
                retryDelay: 1500,
                concurrentAttempts: 3,
                bestPerformingStrategy: 'bestValue'
            },
            peakTimes: [
                { day: 'Monday', hour: 14 },
                { day: 'Wednesday', hour: 16 },
                { day: 'Friday', hour: 10 }
            ],
            serverLoad: {
                low: '02:00-06:00',
                medium: '06:00-14:00',
                high: '14:00-22:00'
            }
        };

        return NextResponse.json(optimization);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load optimization data' },
            { status: 500 }
        );
    }
} 