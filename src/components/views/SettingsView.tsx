'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export function SettingsView() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-slate-400">Configure your CortexOps instance</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic configuration settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-xs text-slate-400">Enable dark theme</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Enabled
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-save Workflows</Label>
                <p className="text-xs text-slate-400">Automatically save changes</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>Configure AI model preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Model</Label>
              <Select defaultValue="gpt-4o-mini">
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temperature</Label>
              <Input
                type="number"
                defaultValue="0.7"
                min="0"
                max="2"
                step="0.1"
                className="mt-1 bg-slate-800 border-slate-700"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Execution Alerts</Label>
                <p className="text-xs text-slate-400">Get notified on execution events</p>
              </div>
              <Button variant="outline" size="sm">
                Enabled
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Error Notifications</Label>
                <p className="text-xs text-slate-400">Alert on workflow failures</p>
              </div>
              <Button variant="outline" size="sm">
                Enabled
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
