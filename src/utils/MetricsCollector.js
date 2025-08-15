/**
 * Metrics Collector
 * Collects and tracks scraping performance metrics
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      duration: 0,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      itemsFound: 0,
      itemsSaved: 0,
      errors: []
    };
  }

  start() {
    this.metrics.startTime = Date.now();
  }

  end() {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
  }

  incrementRequests() {
    this.metrics.requestCount++;
  }

  incrementSuccess() {
    this.metrics.successCount++;
  }

  incrementErrors() {
    this.metrics.errorCount++;
  }

  addError(error) {
    this.metrics.errors.push({
      message: error.message,
      timestamp: Date.now()
    });
    this.incrementErrors();
  }

  setItemsFound(count) {
    this.metrics.itemsFound = count;
  }

  setItemsSaved(count) {
    this.metrics.itemsSaved = count;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requestCount > 0 ? 
        (this.metrics.successCount / this.metrics.requestCount) * 100 : 0,
      errorRate: this.metrics.requestCount > 0 ? 
        (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
      saveRate: this.metrics.itemsFound > 0 ? 
        (this.metrics.itemsSaved / this.metrics.itemsFound) * 100 : 0
    };
  }

  reset() {
    this.metrics = {
      startTime: null,
      endTime: null,
      duration: 0,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      itemsFound: 0,
      itemsSaved: 0,
      errors: []
    };
  }
}

module.exports = MetricsCollector;