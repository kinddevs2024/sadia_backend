import { NextRequest } from 'next/server';
import { create, getAll } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { NewsletterSubscription } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { email } = data;

    if (!email) {
      return errorResponse('Email is required', 400);
    }

    // Проверяем, не подписан ли уже этот email
    const existingSubscriptions = getAll<NewsletterSubscription>('newsletterSubscriptions');
    const existing = existingSubscriptions.find(
      (sub) => sub.email.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      return errorResponse('This email is already subscribed', 400);
    }

    // Создаем подписку
    const subscription = create<NewsletterSubscription>('newsletterSubscriptions', {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      createdAt: new Date().toISOString(),
    });

    return successResponse(subscription, 201);
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

