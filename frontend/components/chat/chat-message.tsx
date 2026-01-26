'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, 
  Bot,
  Copy,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    components: any[];
    createdAt: string;
    metadata?: any;
  };
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const [copiedComponent, setCopiedComponent] = useState<string | null>(null);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const copyToClipboard = async (text: string, componentId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedComponent(componentId);
      setTimeout(() => setCopiedComponent(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderComponent = (component: any, index: number) => {
    const componentId = `${message.id}-${index}`;

    switch (component.type) {
      case 'text':
        return (
          <div key={index} className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{component.data.text}</p>
          </div>
        );

      case 'metric_card':
        return (
          <Card key={index} className="w-full max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {component.data.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold">
                      {component.data.value}
                    </p>
                    {component.data.unit && (
                      <span className="text-sm text-muted-foreground">
                        {component.data.unit}
                      </span>
                    )}
                  </div>
                  {component.data.change && (
                    <p className={`text-sm ${
                      component.data.trend === 'up' ? 'text-green-600' : 
                      component.data.trend === 'down' ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {component.data.change}
                    </p>
                  )}
                </div>
                {component.data.trend && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    component.data.trend === 'up' ? 'bg-green-100 text-green-600' :
                    component.data.trend === 'down' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {component.data.trend === 'up' ? '↗' : 
                     component.data.trend === 'down' ? '↘' : '→'}
                  </div>
                )}
              </div>
              {component.data.description && (
                <p className="text-xs text-muted-foreground mt-2">
                  {component.data.description}
                </p>
              )}
            </CardContent>
          </Card>
        );

      case 'chart':
        return (
          <Card key={index} className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{component.data.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {component.data.type === 'line' && (
                    <LineChart data={component.data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  )}
                  {component.data.type === 'bar' && (
                    <BarChart data={component.data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  )}
                  {component.data.type === 'area' && (
                    <AreaChart data={component.data.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  )}
                  {(component.data.type === 'pie' || component.data.type === 'donut') && (
                    <PieChart>
                      <Pie
                        data={component.data.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={component.data.type === 'donut' ? 40 : 0}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {component.data.data.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(${index * 45}, 70%, 60%)`} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
              {component.data.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {component.data.description}
                </p>
              )}
            </CardContent>
          </Card>
        );

      case 'table':
        return (
          <Card key={index} className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{component.data.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {component.data.headers.map((header: string, i: number) => (
                        <th key={i} className="text-left p-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {component.data.rows.map((row: string[], i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        {row.map((cell: string, j: number) => (
                          <td key={j} className="p-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );

      case 'alert':
        return (
          <Alert key={index} className={`
            ${component.data.severity === 'error' ? 'border-red-200 bg-red-50' : ''}
            ${component.data.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
            ${component.data.severity === 'success' ? 'border-green-200 bg-green-50' : ''}
            ${component.data.severity === 'info' ? 'border-blue-200 bg-blue-50' : ''}
          `}>
            <AlertTitle>{component.data.title}</AlertTitle>
            <AlertDescription>{component.data.message}</AlertDescription>
          </Alert>
        );

      case 'insight_card':
        return (
          <Card key={index} className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{component.data.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {component.data.confidence}% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {component.data.insight}
              </p>
              <Badge variant="secondary" className="text-xs">
                {component.data.category}
              </Badge>
            </CardContent>
          </Card>
        );

      case 'recommendation':
        return (
          <Card key={index} className="w-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{component.data.title}</h4>
                <div className="flex gap-1">
                  <Badge 
                    variant={component.data.priority === 'high' ? 'destructive' : 
                            component.data.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {component.data.priority} priority
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {component.data.effort} effort
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {component.data.description}
              </p>
              {component.data.impact && (
                <p className="text-xs text-green-600 font-medium">
                  Expected impact: {component.data.impact}
                </p>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <div key={index} className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Unsupported component type: {component.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary text-primary-foreground' : 
            isSystem ? 'bg-muted text-muted-foreground' :
            'bg-secondary text-secondary-foreground'
          }`}>
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Message Bubble */}
          {message.content && (
            <div className={`inline-block p-3 rounded-lg mb-2 ${
              isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-foreground'
            }`}>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          )}

          {/* Components */}
          {message.components && message.components.length > 0 && (
            <div className="space-y-3">
              {message.components.map((component, index) => renderComponent(component, index))}
            </div>
          )}

          {/* Metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
            isUser ? 'justify-end' : 'justify-start'
          }`}>
            <span>{formatDate(message.createdAt)}</span>
            {message.metadata?.model && (
              <span>• {message.metadata.model}</span>
            )}
            {!isUser && message.content && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content, message.id)}
                className="h-4 w-4 p-0 ml-1"
              >
                {copiedComponent === message.id ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}