'use client';

import React from 'react';
import { Shield, Info, AlertTriangle, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const auditLogs = [
  { action: 'Workflow executed', user: 'John Doe', time: '2 minutes ago', risk: 'low' },
  { action: 'Credential created', user: 'Jane Smith', time: '15 minutes ago', risk: 'medium' },
  { action: 'User login', user: 'Bob Wilson', time: '1 hour ago', risk: 'low' },
  { action: 'Workflow updated', user: 'John Doe', time: '2 hours ago', risk: 'low' },
];

export function SecurityView() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-slate-400">Audit logs, credentials, and access control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">99.9%</p>
                <p className="text-xs text-slate-400">Security Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-slate-400">Active Credentials</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-slate-400">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      log.risk === 'low'
                        ? 'bg-green-500/10'
                        : log.risk === 'medium'
                        ? 'bg-yellow-500/10'
                        : 'bg-red-500/10'
                    }`}
                  >
                    <Info className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-slate-400">by {log.user}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{log.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
