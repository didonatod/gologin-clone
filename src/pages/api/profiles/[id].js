import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = params;
        // In production, fetch from database
        const profile = {
            id,
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
        };

        return NextResponse.json(profile);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to load profile' },
            { status: 500 }
        );
    }
} 