/**
 * Analytics module for tracking NPM package usage
 * Respects user privacy - only collects aggregate metrics
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { fetch } from './fetch-polyfill.js';

const ANALYTICS_TIMEOUT_MS = Number(process.env.CREEDSPACE_ANALYTICS_TIMEOUT_MS ?? '5000');

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

interface UsageMetrics {
  sessionId: string;
  packageVersion: string;
  nodeVersion: string;
  platform: string;
  persona?: string;
  toolsUsed: string[];
  errorCount: number;
  sessionDuration?: number;
}

export class Analytics {
  private enabled: boolean;
  private sessionId: string;
  private startTime: number;
  private events: AnalyticsEvent[] = [];
  private toolsUsed: Set<string> = new Set();
  private errorCount: number = 0;
  private analyticsEndpoint: string;

  constructor(enabled: boolean = true) {
    // Respect DO_NOT_TRACK and CI environments
    this.enabled = enabled && process.env.DO_NOT_TRACK !== '1' && process.env.CI !== 'true';

    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.analyticsEndpoint =
      process.env.CREEDSPACE_ANALYTICS_URL || 'https://api.creed.space/analytics';

    if (this.enabled) {
      this.setupExitHandler();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupExitHandler(): void {
    const sendMetrics = () => {
      this.sendMetrics().catch((error) => {
        // SECURITY: Log analytics failures for monitoring
        console.error('[ANALYTICS_ERROR] Failed to send metrics on exit', {
          error: error instanceof Error ? error.message : String(error),
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });
        // Don't interrupt user flow, but ensure we log the failure
      });
    };

    // Send metrics on exit
    process.on('exit', sendMetrics);
    process.on('SIGINT', () => {
      sendMetrics();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      sendMetrics();
      process.exit(0);
    });
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    this.events.push({
      event,
      timestamp: new Date().toISOString(),
      properties,
    });

    // Track tool usage
    if (event === 'tool_called' && properties?.tool && typeof properties.tool === 'string') {
      this.toolsUsed.add(properties.tool);
    }

    // Track errors
    if (event === 'error') {
      this.errorCount++;
    }
  }

  async sendMetrics(): Promise<void> {
    if (!this.enabled || this.events.length === 0) return;

    const metrics: UsageMetrics = {
      sessionId: this.sessionId,
      packageVersion: this.getPackageVersion(),
      nodeVersion: process.version,
      platform: os.platform(),
      toolsUsed: Array.from(this.toolsUsed),
      errorCount: this.errorCount,
      sessionDuration: Math.floor((Date.now() - this.startTime) / 1000),
    };

    try {
      // Only send aggregate metrics, no personal data
      await fetch(this.analyticsEndpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(ANALYTICS_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `creedspace-mcp-server/${metrics.packageVersion}`,
        },
        body: JSON.stringify({
          metrics,
          events: this.events.slice(0, 100), // Limit events
        }),
      });
    } catch (error) {
      // SECURITY: Log analytics send failures for debugging
      console.error('[ANALYTICS_SEND_ERROR]', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.analyticsEndpoint,
        sessionId: this.sessionId,
        eventCount: this.events.length,
        timestamp: new Date().toISOString()
      });
      
      // Analytics should never block user, but we need to know about failures
      // Re-throw critical errors that indicate security issues
      if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        throw new Error(`Analytics endpoint unreachable: ${this.analyticsEndpoint}`);
      }
    }
  }

  private getPackageVersion(): string {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return packageJson.version;
    } catch (error) {
      // SECURITY: Log package version read failures
      console.warn('[PACKAGE_VERSION_ERROR]', {
        error: error instanceof Error ? error.message : String(error),
        path: path.join(__dirname, '..', 'package.json'),
        timestamp: new Date().toISOString()
      });
      return 'unknown';
    }
  }

  // Public methods for opting out
  disable(): void {
    this.enabled = false;
    this.events = [];
    this.toolsUsed.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
let analytics: Analytics | null = null;

export function getAnalytics(): Analytics {
  if (!analytics) {
    // Check user preference
    const optOut = process.env.CREEDSPACE_ANALYTICS_OPT_OUT === '1';
    analytics = new Analytics(!optOut);
  }
  return analytics;
}

// Usage tracking helpers
export function trackToolUsage(toolName: string): void {
  getAnalytics().track('tool_called', { tool: toolName });
}

export function trackError(error: Error, context?: string): void {
  getAnalytics().track('error', {
    message: error.message,
    context,
    stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Limited stack
  });
}

export function trackPersonaSwitch(fromPersona: string, toPersona: string): void {
  getAnalytics().track('persona_switched', {
    from: fromPersona,
    to: toPersona,
  });
}

export function trackSessionStart(persona: string): void {
  getAnalytics().track('session_started', { persona });
}

export function trackSessionEnd(): void {
  getAnalytics().track('session_ended', {
    duration: Date.now() - getAnalytics()['startTime'],
  });
}
