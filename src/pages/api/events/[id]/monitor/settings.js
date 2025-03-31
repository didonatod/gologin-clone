import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const settings = await req.json();
        // In production, save to database
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to save monitor settings' },
            { status: 500 }
        );
    }
} 