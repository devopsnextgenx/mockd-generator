import { faker } from '@faker-js/faker';
import type { CardProperty } from '../types';

export type ExecutorFunction = (
  inputs: Record<string, unknown>,
  properties: CardProperty[]
) => Record<string, unknown>;

// Helper function to get property value
const getPropertyValue = (properties: CardProperty[], name: string): unknown => {
  const prop = properties.find(p => p.name === name);
  return prop?.value;
};

// Person Generator
export const personGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const includeEmail = Boolean(getPropertyValue(properties, 'includeEmail'));
  const includePhone = Boolean(getPropertyValue(properties, 'includePhone'));
  const includeAddress = Boolean(getPropertyValue(properties, 'includeAddress'));
  const ageRange = String(getPropertyValue(properties, 'ageRange'));

  const persons = Array.from({ length: count }, () => {
    let age: number;
    switch (ageRange) {
      case 'child':
        age = faker.number.int({ min: 5, max: 12 });
        break;
      case 'teen':
        age = faker.number.int({ min: 13, max: 19 });
        break;
      case 'adult':
        age = faker.number.int({ min: 20, max: 65 });
        break;
      case 'senior':
        age = faker.number.int({ min: 66, max: 90 });
        break;
      default:
        age = faker.number.int({ min: 18, max: 80 });
    }

    const person: Record<string, unknown> = {
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      age,
      gender: faker.person.sex(),
    };

    if (includeEmail) {
      person.email = faker.internet.email({
        firstName: String(person.firstName),
        lastName: String(person.lastName),
      });
    }

    if (includePhone) {
      person.phone = faker.phone.number();
    }

    if (includeAddress) {
      person.address = {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
      };
    }

    return person;
  });

  return { persons };
};

// Company Generator
export const companyGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const includeAddress = Boolean(getPropertyValue(properties, 'includeAddress'));
  const includeWebsite = Boolean(getPropertyValue(properties, 'includeWebsite'));
  const companySize = String(getPropertyValue(properties, 'companySize'));

  const companies = Array.from({ length: count }, () => {
    let employees: number;
    switch (companySize) {
      case 'startup':
        employees = faker.number.int({ min: 1, max: 10 });
        break;
      case 'small':
        employees = faker.number.int({ min: 11, max: 50 });
        break;
      case 'medium':
        employees = faker.number.int({ min: 51, max: 500 });
        break;
      case 'large':
        employees = faker.number.int({ min: 501, max: 10000 });
        break;
      default:
        employees = faker.number.int({ min: 1, max: 10000 });
    }

    const company: Record<string, unknown> = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      industry: faker.company.buzzVerb(),
      employees,
      description: faker.company.catchPhrase(),
    };

    if (includeAddress) {
      company.address = {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
      };
    }

    if (includeWebsite) {
      company.website = faker.internet.url();
    }

    return company;
  });

  return { companies };
};

// Number Generator
export const numberGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const min = Number(getPropertyValue(properties, 'min')) || 1;
  const max = Number(getPropertyValue(properties, 'max')) || 100;
  const precision = Number(getPropertyValue(properties, 'precision')) || 0;

  const numbers = Array.from({ length: count }, () => {
    if (precision === 0) {
      return faker.number.int({ min, max });
    } else {
      return Number(faker.number.float({ min, max, fractionDigits: precision }));
    }
  });

  return { numbers };
};

// Phone Generator
export const phoneGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const format = String(getPropertyValue(properties, 'format'));

  const phones = Array.from({ length: count }, () => {
    switch (format) {
      case 'local':
        return faker.phone.number({ style: 'human' });
      case 'national':
        return faker.phone.number({ style: 'national' });
      case 'international':
        return faker.phone.number({ style: 'international' });
      default:
        return faker.phone.number();
    }
  });

  return { phones };
};

// Internet Generator
export const internetGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const dataType = String(getPropertyValue(properties, 'dataType'));
  const provider = String(getPropertyValue(properties, 'provider'));

  const data = Array.from({ length: count }, () => {
    switch (dataType) {
      case 'email':
        if (provider === 'mixed') {
          return faker.internet.email();
        } else {
          return faker.internet.email({ provider });
        }
      case 'url':
        return faker.internet.url();
      case 'ip':
        return faker.internet.ip();
      case 'domain':
        return faker.internet.domainName();
      case 'username':
        return faker.internet.displayName();
      default:
        return faker.internet.email();
    }
  });

  return { data };
};

// Location Generator
export const locationGenerator: ExecutorFunction = (inputs, properties) => {
  const count = Number(inputs.count) || 10;
  const includeCoordinates = Boolean(getPropertyValue(properties, 'includeCoordinates'));
  const locationType = String(getPropertyValue(properties, 'locationType'));

  const locations = Array.from({ length: count }, () => {
    const location: Record<string, unknown> = {
      id: faker.string.uuid(),
    };

    switch (locationType) {
      case 'address':
        location.street = faker.location.streetAddress();
        location.city = faker.location.city();
        location.state = faker.location.state();
        location.zipCode = faker.location.zipCode();
        location.country = faker.location.country();
        break;
      case 'city':
        location.city = faker.location.city();
        location.state = faker.location.state();
        location.country = faker.location.country();
        break;
      case 'coordinates':
        location.latitude = faker.location.latitude();
        location.longitude = faker.location.longitude();
        break;
      case 'zipcode':
        location.zipCode = faker.location.zipCode();
        break;
      default:
        location.street = faker.location.streetAddress();
        location.city = faker.location.city();
        location.state = faker.location.state();
        location.zipCode = faker.location.zipCode();
        location.country = faker.location.country();
    }

    if (includeCoordinates && locationType !== 'coordinates') {
      location.latitude = faker.location.latitude();
      location.longitude = faker.location.longitude();
    }

    return location;
  });

  return { locations };
};

// Filter Generator
export const filterGenerator: ExecutorFunction = (inputs, properties) => {
  const array = inputs.array as unknown[];
  if (!Array.isArray(array)) {
    return { filtered: [] };
  }

  const field = String(getPropertyValue(properties, 'field'));
  const operator = String(getPropertyValue(properties, 'operator'));
  const value = getPropertyValue(properties, 'value');

  const filtered = array.filter(item => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const fieldValue = (item as Record<string, unknown>)[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greater':
        return Number(fieldValue) > Number(value);
      case 'less':
        return Number(fieldValue) < Number(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return true;
    }
  });

  return { filtered };
};

// Transform Generator
export const transformGenerator: ExecutorFunction = (inputs, properties) => {
  const data = inputs.data as unknown[];
  if (!Array.isArray(data)) {
    return { transformed: [] };
  }

  const operation = String(getPropertyValue(properties, 'operation'));
  const field = String(getPropertyValue(properties, 'field'));

  let transformed: unknown[];

  switch (operation) {
    case 'pluck':
      transformed = data.map(item => {
        if (typeof item === 'object' && item !== null) {
          return (item as Record<string, unknown>)[field];
        }
        return null;
      }).filter(item => item !== null);
      break;
    case 'groupBy': {
      // Simple grouping implementation
      const groups: Record<string, unknown[]> = {};
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const key = String((item as Record<string, unknown>)[field]);
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(item);
        }
      });
      transformed = Object.entries(groups).map(([key, items]) => ({
        group: key,
        items,
        count: items.length,
      }));
      break;
    }
    case 'sort':
      transformed = [...data].sort((a, b) => {
        if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
          const aValue = (a as Record<string, unknown>)[field];
          const bValue = (b as Record<string, unknown>)[field];
          
          // Convert to strings for comparison
          const aStr = String(aValue);
          const bStr = String(bValue);
          
          if (aStr < bStr) return -1;
          if (aStr > bStr) return 1;
          return 0;
        }
        return 0;
      });
      break;
    default:
      transformed = data;
  }

  return { transformed };
};

// Print Array Executor - passes through the array and outputs it
export const printArrayExecutor: ExecutorFunction = (inputs) => {
  const array = inputs.array as Array<Record<string, unknown>> || [];
  
  return { 
    printed: array // Pass through the array unchanged
  };
};

// JSON Preview Executor - passes through any data and outputs it
export const jsonPreviewExecutor: ExecutorFunction = (inputs) => {
  const data = inputs.data || {};
  
  return { 
    passthrough: data // Pass through the data unchanged
  };
};

// Registry of all executors
export const executors: Record<string, ExecutorFunction> = {
  personGenerator,
  companyGenerator,
  numberGenerator,
  phoneGenerator,
  internetGenerator,
  locationGenerator,
  filterGenerator,
  transformGenerator,
  printArrayExecutor,
  jsonPreviewExecutor,
};
