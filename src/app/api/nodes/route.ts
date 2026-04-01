// CortexOps - Node Registry API
import { NextRequest, NextResponse } from 'next/server';
import { nodeRegistry, getNodeDefinition, getNodesByCategory, nodeCategories } from '@/lib/node-registry';

// GET /api/nodes/registry - Get all available node types
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    if (type) {
      // Return specific node type
      const nodeDef = getNodeDefinition(type as any);
      if (!nodeDef) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Node type not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: nodeDef });
    }

    if (category) {
      // Return nodes by category
      const nodes = getNodesByCategory(category);
      return NextResponse.json({ success: true, data: nodes });
    }

    // Return all nodes grouped by category
    const groupedNodes = nodeCategories.map((cat) => ({
      ...cat,
      nodes: getNodesByCategory(cat.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        categories: groupedNodes,
        nodes: nodeRegistry,
      },
    });
  } catch (error) {
    console.error('Error fetching node registry:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch node registry' } },
      { status: 500 }
    );
  }
}
