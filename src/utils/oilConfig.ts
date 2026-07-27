export const getMaxOilHours = (millName: string): number => {
  const isSmallMill = millName === 'Molino I' || millName === 'Molino II' || millName === 'MOLINO I' || millName === 'MOLINO II';
  return isSmallMill ? 100 : 1000;
};
