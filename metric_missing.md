It seems some services are not been read for metrics fetching and normalising. Also there seems to be duplicate metrics returned and display on the dashboard and analysis details on all tabs. kindly review the missing metrics not used and it seems there's some sytnax differentiates because I can see sql syntax. review the below task too to make sure the metrics rendered on the frntend are business centric and have integrity

Implement comprehensive UserJourneyAnalyzer
    - Track user behavior patterns across transaction sequences and
function signatures
    - Analyze function call flows and identify drop-off points
    - Identify successful paths and failure patterns

 Implement function call pattern analysis
    - Analyze function call sequences and user journey patterns
    - Identify functions that cause transaction failures
    - Track function usage trends over time

Implement User Lifecycle and Cohort Analysis
  - Create UserLifecycleAnalyzer service
    - Track wallet activation and first transaction timing
    - Classify wallet types (active, inactive, dormant, churned)
    - Measure user progression through contract functions