import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { executionQueue } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'workflows', 'execute');
    const url = new URL(request.url);
    const workflowId = url.pathname.split('/').slice(-2, -1)[0];

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Workflow ID is required' } },
        { status: 400 }
      );
    }

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true, edges: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      );
    }

    // Create execution record
    const execution = await db.execution.create({
      data: {
        workflowId,
        status: 'pending',
        triggerType: 'manual',
        totalTokens: 0,
        totalCost: 0,
        metadata: {},
        steps: { create: [] },
        createdAt: new Date(),
      },
    });

    // Add job to execution queue
    await executionQueue.add('execute-workflow', {
      workflowId,
      executionId: execution.id,
      triggeredBy: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { executionId: execution.id, status: 'queued' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to execute workflow' } },
      { status: 500 }
    );
  }
}
