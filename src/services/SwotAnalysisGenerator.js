/**
 * SWOT Analysis Generator - Task 23
 * Multi-Chain RPC Integration
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

export class SwotAnalysisGenerator {
  constructor(competitiveData, marketData, gapAnalysis) {
    this.competitiveData = competitiveData;
    this.marketData = marketData;
    this.gapAnalysis = gapAnalysis;
    this.swotHistory = [];
  }

  /**
   * Generate comprehensive SWOT analysis
   */
  async generateSwotAnalysis() {
    const swot = {
      strengths: await this._identifyStrengths(),
      weaknesses: await this._identifyWeaknesses(),
      opportunities: await this._identifyOpportunities(),
      threats: await this._identifyThreats(),
      timestamp: new Date(),
      confidence: this._calculateConfidence()
    };

    this.swotHistory.push(swot);
    return swot;
  }

  /**
   * Identify organizational strengths
   */
  async _identifyStrengths() {
    const strengths = [];
    const ourMetrics = this.competitiveData.target?.metrics || {};
    const competitorMetrics = Object.values(this.competitiveData.competitors || {});

    // Performance strengths
    if (ourMetrics.successRate > this._getCompetitorAverage('successRate')) {
      strengths.push({
        category: 'performance',
        strength: 'High transaction success rate',
        value: ourMetrics.successRate,
        evidence: 'Above competitor average',
        impact: 'high'
      });
    }

    // Feature strengths
    const uniqueFeatures = this.gapAnalysis?.gaps?.feature?.unique || [];
    if (uniqueFeatures.length > 0) {
      strengths.push({
        category: 'features',
        strength: 'Unique feature set',
        value: uniqueFeatures.length,
        evidence: `${uniqueFeatures.length} unique features`,
        impact: 'medium'
      });
    }

    // Market strengths
    if (ourMetrics.userGrowthRate > this._getCompetitorAverage('userGrowthRate')) {
      strengths.push({
        category: 'market',
        strength: 'Strong user growth',
        value: ourMetrics.userGrowthRate,
        evidence: 'Above market average growth rate',
        impact: 'high'
      });
    }

    return strengths;
  }

  /**
   * Identify organizational weaknesses
   */
  async _identifyWeaknesses() {
    const weaknesses = [];
    const ourMetrics = this.competitiveData.target?.metrics || {};

    // Performance weaknesses
    if (ourMetrics.avgGasCost > this._getCompetitorAverage('avgGasCost')) {
      weaknesses.push({
        category: 'performance',
        weakness: 'High gas costs',
        value: ourMetrics.avgGasCost,
        evidence: 'Above competitor average',
        impact: 'high',
        urgency: 'high'
      });
    }

    // Feature gaps
    const missingFeatures = this.gapAnalysis?.gaps?.feature?.missing || [];
    if (missingFeatures.length > 0) {
      weaknesses.push({
        category: 'features',
        weakness: 'Missing key features',
        value: missingFeatures.length,
        evidence: `${missingFeatures.length} features behind competitors`,
        impact: 'medium',
        urgency: 'medium'
      });
    }

    // Market weaknesses
    if (ourMetrics.marketShare < this._getCompetitorAverage('marketShare')) {
      weaknesses.push({
        category: 'market',
        weakness: 'Low market share',
        value: ourMetrics.marketShare,
        evidence: 'Below competitor average',
        impact: 'high',
        urgency: 'medium'
      });
    }

    return weaknesses;
  }

  /**
   * Identify market opportunities
   */
  async _identifyOpportunities() {
    const opportunities = [];

    // Market growth opportunities
    if (this.marketData?.growthTrend > 0.1) {
      opportunities.push({
        category: 'market',
        opportunity: 'Growing market demand',
        potential: 'high',
        timeframe: 'short-term',
        evidence: `${(this.marketData.growthTrend * 100).toFixed(1)}% market growth`,
        actionRequired: 'Increase marketing and user acquisition'
      });
    }

    // Technology opportunities
    const emergingTrends = this._identifyEmergingTrends();
    emergingTrends.forEach(trend => {
      opportunities.push({
        category: 'technology',
        opportunity: `Adopt ${trend.name}`,
        potential: trend.potential,
        timeframe: trend.timeframe,
        evidence: trend.evidence,
        actionRequired: trend.action
      });
    });

    // Competitive opportunities
    const competitorWeaknesses = this._identifyCompetitorWeaknesses();
    competitorWeaknesses.forEach(weakness => {
      opportunities.push({
        category: 'competitive',
        opportunity: `Exploit competitor weakness in ${weakness.area}`,
        potential: 'medium',
        timeframe: 'medium-term',
        evidence: weakness.evidence,
        actionRequired: weakness.action
      });
    });

    return opportunities;
  }

  /**
   * Identify market threats
   */
  async _identifyThreats() {
    const threats = [];

    // Competitive threats
    const strongCompetitors = Object.entries(this.competitiveData.competitors || {})
      .filter(([_, competitor]) => competitor.metrics?.marketShare > this.competitiveData.target?.metrics?.marketShare);

    if (strongCompetitors.length > 0) {
      threats.push({
        category: 'competitive',
        threat: 'Strong competitor presence',
        severity: 'high',
        probability: 'high',
        evidence: `${strongCompetitors.length} competitors with higher market share`,
        mitigation: 'Differentiate through unique features and better performance'
      });
    }

    // Technology threats
    if (this._detectTechnologicalDisruption()) {
      threats.push({
        category: 'technology',
        threat: 'Technological disruption',
        severity: 'medium',
        probability: 'medium',
        evidence: 'Emerging technologies could disrupt current model',
        mitigation: 'Invest in R&D and stay ahead of technology trends'
      });
    }

    // Market threats
    if (this.marketData?.volatility > 0.3) {
      threats.push({
        category: 'market',
        threat: 'Market volatility',
        severity: 'medium',
        probability: 'high',
        evidence: `High market volatility (${(this.marketData.volatility * 100).toFixed(1)}%)`,
        mitigation: 'Diversify offerings and build resilient systems'
      });
    }

    return threats;
  }

  /**
   * Calculate confidence in SWOT analysis
   */
  _calculateConfidence() {
    const dataQuality = this._assessDataQuality();
    const sampleSize = this._assessSampleSize();
    const recency = this._assessDataRecency();
    
    return (dataQuality + sampleSize + recency) / 3;
  }

  /**
   * Get competitor average for metric
   */
  _getCompetitorAverage(metric) {
    const values = Object.values(this.competitiveData.competitors || {})
      .map(c => c.metrics?.[metric])
      .filter(v => v != null);
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  /**
   * Identify emerging trends
   */
  _identifyEmergingTrends() {
    return [
      {
        name: 'Layer 2 scaling',
        potential: 'high',
        timeframe: 'short-term',
        evidence: 'Growing adoption of L2 solutions',
        action: 'Implement L2 integration'
      },
      {
        name: 'Cross-chain interoperability',
        potential: 'high',
        timeframe: 'medium-term',
        evidence: 'Increasing demand for cross-chain solutions',
        action: 'Develop cross-chain capabilities'
      }
    ];
  }

  /**
   * Identify competitor weaknesses
   */
  _identifyCompetitorWeaknesses() {
    const weaknesses = [];
    
    Object.entries(this.competitiveData.competitors || {}).forEach(([name, competitor]) => {
      if (competitor.metrics?.successRate < 0.9) {
        weaknesses.push({
          competitor: name,
          area: 'reliability',
          evidence: `Low success rate (${(competitor.metrics.successRate * 100).toFixed(1)}%)`,
          action: 'Emphasize our higher reliability in marketing'
        });
      }
    });

    return weaknesses;
  }

  /**
   * Detect technological disruption
   */
  _detectTechnologicalDisruption() {
    // Simple heuristic - in real implementation, this would analyze market trends
    return Math.random() > 0.7; // 30% chance of disruption detected
  }

  /**
   * Assess data quality
   */
  _assessDataQuality() {
    const hasCompetitiveData = Object.keys(this.competitiveData.competitors || {}).length > 0;
    const hasMarketData = this.marketData != null;
    const hasGapAnalysis = this.gapAnalysis != null;
    
    return (hasCompetitiveData + hasMarketData + hasGapAnalysis) / 3;
  }

  /**
   * Assess sample size
   */
  _assessSampleSize() {
    const competitorCount = Object.keys(this.competitiveData.competitors || {}).length;
    return Math.min(competitorCount / 5, 1); // Normalize to 0-1, optimal at 5+ competitors
  }

  /**
   * Assess data recency
   */
  _assessDataRecency() {
    const now = new Date();
    const dataAge = this.competitiveData.timestamp ? 
      (now - new Date(this.competitiveData.timestamp)) / (1000 * 60 * 60 * 24) : 30; // Default 30 days
    
    return Math.max(0, 1 - (dataAge / 30)); // Decay over 30 days
  }

  /**
   * Generate SWOT trend analysis
   */
  generateTrendAnalysis() {
    if (this.swotHistory.length < 2) {
      return { message: 'Insufficient historical data for trend analysis' };
    }

    const latest = this.swotHistory[this.swotHistory.length - 1];
    const previous = this.swotHistory[this.swotHistory.length - 2];

    return {
      strengthsTrend: this._compareSections(latest.strengths, previous.strengths),
      weaknessesTrend: this._compareSections(latest.weaknesses, previous.weaknesses),
      opportunitiesTrend: this._compareSections(latest.opportunities, previous.opportunities),
      threatsTrend: this._compareSections(latest.threats, previous.threats),
      overallTrend: this._calculateOverallTrend(latest, previous)
    };
  }

  /**
   * Compare SWOT sections
   */
  _compareSections(current, previous) {
    return {
      added: current.length - previous.length,
      trend: current.length > previous.length ? 'improving' : 
             current.length < previous.length ? 'declining' : 'stable'
    };
  }

  /**
   * Calculate overall trend
   */
  _calculateOverallTrend(latest, previous) {
    const latestScore = latest.strengths.length + latest.opportunities.length - 
                       latest.weaknesses.length - latest.threats.length;
    const previousScore = previous.strengths.length + previous.opportunities.length - 
                         previous.weaknesses.length - previous.threats.length;
    
    return latestScore > previousScore ? 'improving' : 
           latestScore < previousScore ? 'declining' : 'stable';
  }

  /**
   * Generate strategic insights
   */
  generateStrategicInsights() {
    const latest = this.swotHistory[this.swotHistory.length - 1];
    if (!latest) return [];

    const insights = [];

    // Strength-Opportunity combinations
    latest.strengths.forEach(strength => {
      latest.opportunities.forEach(opportunity => {
        if (this._areRelated(strength.category, opportunity.category)) {
          insights.push({
            type: 'SO_strategy',
            description: `Leverage ${strength.strength} to capitalize on ${opportunity.opportunity}`,
            priority: 'high'
          });
        }
      });
    });

    // Weakness-Threat combinations
    latest.weaknesses.forEach(weakness => {
      latest.threats.forEach(threat => {
        if (this._areRelated(weakness.category, threat.category)) {
          insights.push({
            type: 'WT_strategy',
            description: `Address ${weakness.weakness} to mitigate ${threat.threat}`,
            priority: 'critical'
          });
        }
      });
    });

    return insights;
  }

  /**
   * Check if categories are related
   */
  _areRelated(category1, category2) {
    const relations = {
      performance: ['technology', 'competitive'],
      features: ['market', 'competitive'],
      market: ['competitive', 'technology']
    };

    return relations[category1]?.includes(category2) || 
           relations[category2]?.includes(category1) ||
           category1 === category2;
  }
}
