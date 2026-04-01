'use client';

import React from 'react';
import { Plug, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const connectors = [
  { name: 'OpenAI', status: 'healthy', type: 'AI Provider' },
  { name: 'Slack', status: 'healthy', type: 'Communication' },
  { name: 'PostgreSQL', status: 'healthy', type: 'Database' },
  { name: 'SendGrid', status: 'degraded', type: 'Email' },
  { name: 'AWS S3', status: 'healthy', type: 'Storage' },
  { name: 'Stripe', status: 'healthy', type: 'Payment' },
];

export function ConnectorsView() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Connectors</h2>
          <p className="text-slate-400">Manage API connectors and integrations</p>
        </div>
        <Button className="bg-indigo-500 hover:bg-indigo-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Connector
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((connector) => (
          <Card key={connector.name} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Plug className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium">{connector.name}</p>
                    <p className="text-xs text-slate-400">{connector.type}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    connector.status === 'healthy'
                      ? 'border-green-500 text-green-400'
                      : 'border-yellow-500 text-yellow-400'
                  }
                >
                  {connector.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
