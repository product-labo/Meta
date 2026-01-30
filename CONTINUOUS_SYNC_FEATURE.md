# Continuous Sync Feature (Marathon Sync)

## Overview

The Continuous Sync feature allows users to keep their default contract data continuously updated by running multiple analysis cycles until manually stopped. This "marathon" approach ensures comprehensive data collection and real-time metrics updates.

## Features

### 🔄 Continuous Data Fetching
- Runs multiple analysis cycles automatically
- Accumulates data across cycles instead of replacing it
- Expands block range progressively for deeper analysis
- Updates metrics in real-time

### 🛑 User-Controlled Stopping
- "Stop Sync" button to halt continuous syncing
- Preserves all accumulated data when stopped
- Graceful shutdown with final metrics calculation

### 📊 Enhanced Data Accumulation
- **Transactions**: Merges new transactions, avoids duplicates by hash
- **Events**: Accumulates contract events, prevents duplicate entries
- **Users**: Updates existing users, adds new ones with combined metrics
- **Metrics**: Recalculates with accumulated data for accuracy

### 🎯 Smart Progress Tracking
- Real-time progress updates
- Cycle counter display
- Data freshness timestamps
- Accumulated block range tracking

## User Interface

### Dashboard Controls

1. **Quick Sync** - Traditional single-cycle refresh
2. **Marathon Sync** - Continuous syncing mode
3. **Stop Sync** - Halts continuous syncing (only visible during marathon mode)

### Status Indicators

- **Live Sync Active** - Green badge when continuous sync is running
- **Marathon Sync (Cycle X)** - Shows current cycle number
- **Progress Bar** - Real-time progress with cycle information
- **Data Freshness** - Last update timestamps on metrics

## Technical Implementation

### Backend API Endpoints

#### Start Continuous Sync
```javascript
POST /api/onboarding/refresh-default-contract
{
  "continuous": true
}
```

#### Stop Continuous Sync
```javascript
POST /api/onboarding/stop-continuous-sync
```

### Data Flow

1. **Cycle Initialization**
   - Check if continuous sync should continue
   - Update progress and metadata
   - Expand block range for deeper analysis

2. **Data Collection**
   - Fetch new contract interactions
   - Analyze transactions and events
   - Extract user behavior patterns

3. **Data Accumulation**
   - Merge new data with existing accumulated data
   - Avoid duplicates using hash-based deduplication
   - Update user metrics with combined values

4. **Metrics Recalculation**
   - Recalculate all metrics with accumulated data
   - Update TVL, volume, user counts, etc.
   - Generate enhanced insights

5. **Cycle Completion**
   - Store updated results
   - Wait 5 seconds before next cycle
   - Continue until stopped or safety limit (50 cycles)

### Safety Features

- **Maximum Cycles**: Automatically stops after 50 cycles for safety
- **Error Handling**: Continues despite individual cycle errors
- **Graceful Shutdown**: Preserves data when stopped
- **Resource Limits**: Limits stored data for performance (500 transactions, 100 users)

## Benefits

### For Users
- **Comprehensive Data**: More complete picture of contract activity
- **Real-time Updates**: Live metrics that update continuously
- **Flexible Control**: Start and stop syncing as needed
- **Better Insights**: Accumulated data provides deeper analysis

### For Analytics
- **Deeper Analysis**: Expanded block ranges capture more activity
- **Historical Trends**: Accumulated data shows patterns over time
- **Enhanced Accuracy**: More data points improve metric reliability
- **Live Monitoring**: Real-time contract performance tracking

## Usage Examples

### Starting Marathon Sync
1. Navigate to Dashboard
2. Click "Marathon Sync" button
3. Monitor progress and cycle counter
4. View real-time metric updates

### Stopping Marathon Sync
1. Click "Stop Sync" button (red button during sync)
2. Wait for graceful shutdown
3. Review final accumulated metrics
4. Data remains available for analysis

### Monitoring Progress
- Progress bar shows current cycle progress
- Cycle counter indicates number of completed cycles
- Metrics update in real-time with accumulated data
- Timestamps show data freshness

## Configuration

### Environment Variables
- `ANALYSIS_BLOCK_RANGE`: Base block range (multiplied by cycle number)
- `MAX_CONCURRENT_REQUESTS`: Concurrent API requests limit
- `FAILOVER_TIMEOUT`: RPC failover timeout

### Safety Limits
- Maximum 50 cycles per continuous sync session
- 5-second delay between cycles
- 500 transaction limit for UI display
- 100 user limit for UI display

## Error Handling

### Cycle Errors
- Individual cycle failures don't stop continuous sync
- Errors are logged but sync continues
- Retry logic with exponential backoff

### Network Issues
- RPC failover for reliability
- Timeout handling for stuck requests
- Graceful degradation on partial failures

### User Interruption
- Immediate response to stop requests
- Data preservation during shutdown
- Clean state management

## Performance Considerations

### Data Management
- Deduplication prevents memory bloat
- Limited UI display for performance
- Efficient data structures for accumulation

### API Efficiency
- Interaction-based fetching for speed
- Batch processing where possible
- Smart caching of repeated requests

### Resource Usage
- Progressive block range expansion
- Controlled concurrent requests
- Memory-efficient data structures

## Future Enhancements

### Planned Features
- **Custom Cycle Intervals**: User-configurable delay between cycles
- **Selective Data Types**: Choose which data to accumulate
- **Export Options**: Download accumulated data
- **Scheduling**: Automated continuous sync schedules

### Advanced Analytics
- **Trend Analysis**: Historical pattern detection
- **Anomaly Detection**: Unusual activity alerts
- **Predictive Metrics**: Forecasting based on accumulated data
- **Cross-Contract Comparison**: Multi-contract continuous sync

## Troubleshooting

### Common Issues

1. **Sync Won't Start**
   - Check if another sync is already running
   - Verify default contract configuration
   - Check network connectivity

2. **Sync Stops Unexpectedly**
   - Review error logs for cycle failures
   - Check RPC endpoint availability
   - Verify sufficient API rate limits

3. **Missing Data**
   - Ensure sufficient block range
   - Check contract activity in specified range
   - Verify RPC endpoint synchronization

### Debug Information
- Check browser console for API errors
- Review server logs for backend issues
- Monitor network requests for failures
- Verify authentication tokens

## Security Considerations

- **Rate Limiting**: Respects API rate limits
- **Authentication**: Requires valid user session
- **Data Privacy**: User data remains isolated
- **Resource Protection**: Safety limits prevent abuse

---

*The Continuous Sync feature provides a powerful way to maintain up-to-date contract analytics with minimal user intervention while ensuring data accuracy and system stability.*