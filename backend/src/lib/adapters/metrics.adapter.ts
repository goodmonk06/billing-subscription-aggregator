/**
 * Metrics Adapter Interface
 *
 * Implement this interface to send metrics to different backends
 * (Prometheus, Datadog, CloudWatch, etc.)
 */

export interface MetricLabels {
  [key: string]: string | number;
}

export interface IMetricsAdapter {
  /**
   * Record a counter metric (monotonically increasing value)
   */
  recordCounter(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Record a gauge metric (arbitrary value that can go up or down)
   */
  recordGauge(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Record a histogram metric (distribution of values)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): Promise<void>;

  /**
   * Record revenue metrics
   */
  recordRevenue(amount: number, currency: string, labels?: MetricLabels): Promise<void>;

  /**
   * Record subscription metrics
   */
  recordSubscription(action: 'created' | 'canceled' | 'updated', labels?: MetricLabels): Promise<void>;
}

/**
 * In-memory metrics adapter for development and testing
 */
export class InMemoryMetricsAdapter implements IMetricsAdapter {
  private readonly metrics: Map<string, Array<{ value: number; labels?: MetricLabels; timestamp: Date }>> = new Map();

  async recordCounter(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.record(name, value, labels);
    console.log(`[Metric] Counter ${name}: ${value}`, labels);
  }

  async recordGauge(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.record(name, value, labels);
    console.log(`[Metric] Gauge ${name}: ${value}`, labels);
  }

  async recordHistogram(name: string, value: number, labels?: MetricLabels): Promise<void> {
    this.record(name, value, labels);
    console.log(`[Metric] Histogram ${name}: ${value}`, labels);
  }

  async recordRevenue(amount: number, currency: string, labels?: MetricLabels): Promise<void> {
    await this.recordCounter('billing.revenue', amount, { currency, ...labels });
  }

  async recordSubscription(action: 'created' | 'canceled' | 'updated', labels?: MetricLabels): Promise<void> {
    await this.recordCounter(`billing.subscription.${action}`, 1, labels);
  }

  private record(name: string, value: number, labels?: MetricLabels): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push({ value, labels, timestamp: new Date() });
  }

  getMetrics(name?: string) {
    if (name) {
      return this.metrics.get(name) || [];
    }
    return Object.fromEntries(this.metrics.entries());
  }

  clear() {
    this.metrics.clear();
  }
}
