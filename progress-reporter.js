
/**
 * Progress reporter for granular updates
 */
class ProgressReporter {
  constructor(analysisId, userId, totalSteps = 10) {
    this.analysisId = analysisId;
    this.userId = userId;
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.baseProgress = 30; // Start from 30%
    this.maxProgress = 80;  // End at 80%
  }

  async updateProgress(step, message = '') {
    this.currentStep = step;
    const progress = Math.min(
      this.maxProgress,
      this.baseProgress + ((step / this.totalSteps) * (this.maxProgress - this.baseProgress))
    );
    
    console.log(`📊 Progress: ${progress}% - ${message}`);
    
    try {
      // Update analysis progress
      await AnalysisStorage.update(this.analysisId, { 
        progress,
        lastUpdate: new Date().toISOString(),
        currentStep: message
      });
      
      // Update user progress
      const currentUser = await UserStorage.findById(this.userId);
      if (currentUser?.onboarding?.defaultContract) {
        const updatedOnboarding = {
          ...currentUser.onboarding,
          defaultContract: {
            ...currentUser.onboarding.defaultContract,
            indexingProgress: progress,
            lastUpdate: new Date().toISOString(),
            currentStep: message
          }
        };
        await UserStorage.update(this.userId, { onboarding: updatedOnboarding });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }
}
