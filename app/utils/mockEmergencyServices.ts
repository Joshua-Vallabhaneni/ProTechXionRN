/**
 * Mock emergency services for testing
 * These are used as fallbacks when the real services can't be reached
 */

export const mockEmergencyCall = async (phoneNumber: string = '911'): Promise<void> => {
  console.log(`MOCK: Placing emergency call to ${phoneNumber}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('MOCK: Emergency call connected');
  console.log('MOCK: Automated message playing: "This is an emergency alert from ProTechXion..."');
};

export const mockEmergencyText = async (phoneNumber: string = '911', message: string = 'Emergency alert: Shooter detected'): Promise<void> => {
  console.log(`MOCK: Sending emergency text to ${phoneNumber}`);
  console.log(`MOCK: Message content: "${message}"`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  console.log('MOCK: Emergency text sent successfully');
}; 