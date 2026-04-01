import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executionQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();

    if (!path) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PATH', message: 'Webhook path is required' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const method = request.method;
    const headersObj = Object.fromEntries(request.headers.entries());

    // Find workflow with matching webhook trigger
    const workflow = await db.workflow.findFirst({
      where: {
        status: 'active',
        triggerType: 'webhook',
        nodes: {
          some: {
            type: 'trigger.webhook',
          },
        },
      },
      include: { nodes: true, edges: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No active webhook found for this path' } },
        { status: 404 }
      );
    }

    // Create execution record
    const execution = await db.execution.create({
      data: {
        workflowId: workflow.id,
        status: 'pending',
        triggerType: 'webhook',
        triggerData: { body, method, headers: headersObj, path },
        totalTokens: 0,
        totalCost: 0,
        metadata: {},
        steps: { create: [] },
        createdAt: new Date(),
      },
    });

    // Add job to execution queue
    await executionQueue.add('execute-workflow', {
      workflowId: workflow.id,
      executionId: execution.id,
      triggeredBy: 'webhook',
      inputData: body,
    });

    return NextResponse.json({
      success: true,
      data: { executionId: execution.id, status: 'queued' },
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process webhook' } },
      { status: 500 }
    );
  }
}
