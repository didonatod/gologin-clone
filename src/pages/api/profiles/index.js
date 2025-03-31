import { NextResponse } from 'next/server';

export async function GET(req) {
    try {
        // In production, fetch from database
        const profiles = [
            {
                id: 'default-profile',
                name: 'Default Profile',
                browserSettings: {
                    userAgent: 'Mozilla/5.0...',
                    resolution: '1920x1080',
                    proxy: 'http://proxy.example.com'
                },
                purchaseDetails: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                }
            }
        ];

        return NextResponse.json(profiles);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load profiles' },
            { status: 500 }
        );
    }
} 