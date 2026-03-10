import type {
  IDaisyconClient,
  DaisyconPublisher,
  DaisyconProgram,
  DaisyconMaterial,
  DaisyconTransaction,
} from './types';

// Alle 18 leveranciers met realistische mock Daisycon data
const MOCK_PROGRAMS: DaisyconProgram[] = [
  { id: 20001, name: 'Frank Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 35, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20001&li=380001&ws=deverzkeringsagent' },
  { id: 20002, name: 'Zonneplan BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 25, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20002&li=380002&ws=deverzkeringsagent' },
  { id: 20003, name: 'Budget Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 55, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20003&li=380003&ws=deverzkeringsagent' },
  { id: 20004, name: 'Tibber Nederland BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 15, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20004&li=380004&ws=deverzkeringsagent' },
  { id: 20005, name: 'Greenchoice BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 40, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20005&li=380005&ws=deverzkeringsagent' },
  { id: 20006, name: 'Vattenfall Nederland NV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 65, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20006&li=380006&ws=deverzkeringsagent' },
  { id: 20007, name: 'Eneco Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 50, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20007&li=380007&ws=deverzkeringsagent' },
  { id: 20008, name: 'Essent Retail Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 60, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20008&li=380008&ws=deverzkeringsagent' },
  { id: 20009, name: 'Powerpeers BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 20, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20009&li=380009&ws=deverzkeringsagent' },
  { id: 20010, name: 'DELTA Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 25, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20010&li=380010&ws=deverzkeringsagent' },
  { id: 20011, name: 'Pure Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 30, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20011&li=380011&ws=deverzkeringsagent' },
  { id: 20012, name: 'ENGIE Energie Nederland NV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 35, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20012&li=380012&ws=deverzkeringsagent' },
  { id: 20013, name: 'Oxxio Nederland BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 20, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20013&li=380013&ws=deverzkeringsagent' },
  { id: 20014, name: 'Coolblue Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 45, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20014&li=380014&ws=deverzkeringsagent' },
  { id: 20015, name: 'United Consumers BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 25, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20015&li=380015&ws=deverzkeringsagent' },
  { id: 20016, name: 'Vandebron Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 30, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20016&li=380016&ws=deverzkeringsagent' },
  { id: 20017, name: 'NLE BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 20, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20017&li=380017&ws=deverzkeringsagent' },
  { id: 20018, name: 'ANWB Energie BV', status: 'active', category: 'Energie', commission_type: 'cpl', commission_amount: 35, currency: 'EUR', tracking_url: 'https://tc.daisycon.com/mock/click?si=20018&li=380018&ws=deverzkeringsagent' },
];

export class MockDaisyconClient implements IDaisyconClient {
  async getPublishers(): Promise<DaisyconPublisher[]> {
    return [{ id: 99999, name: 'DeVerzekeringsAgent (Mock)', status: 'active' }];
  }

  async getPrograms(): Promise<DaisyconProgram[]> {
    return MOCK_PROGRAMS;
  }

  async getMaterials(_publisherId: number, programId: number): Promise<DaisyconMaterial[]> {
    const program = MOCK_PROGRAMS.find(p => p.id === programId);
    if (!program) return [];

    return [{
      id: programId * 10,
      program_id: programId,
      name: `${program.name} - Textlink`,
      type: 'textlink',
      url: program.tracking_url,
      tracking_url: program.tracking_url,
    }];
  }

  async getTransactions(): Promise<DaisyconTransaction[]> {
    // Mock: geen transacties
    return [];
  }
}
