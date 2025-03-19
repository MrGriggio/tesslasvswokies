/**
 * Crypto polyfill for Node.js environments that don't support webcrypto
 */

// Use crypto from Node.js if available
if (typeof global !== 'undefined' && !global.crypto) {
  try {
    const nodeCrypto = require('crypto');
    
    // Create a polyfill for the getRandomValues function
    const getRandomValues = function(array) {
      const bytes = nodeCrypto.randomBytes(array.length);
      for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes[i];
      }
      return array;
    };
    
    // Assign crypto and its methods to the global object
    global.crypto = {
      getRandomValues: getRandomValues
    };
    
    console.log('Crypto polyfill installed successfully');
  } catch (error) {
    console.error('Failed to load crypto polyfill:', error);
  }
}

export default {}; 