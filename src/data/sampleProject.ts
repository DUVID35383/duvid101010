import { Project } from '../types';
import { DEFAULT_TERMS_TEXT } from './defaultTerms';

export const SAMPLE_PROJECT: Project = {
  id: 'proj_sample_01',
  name: 'חדר נייד למשרד ומגורים 6x2.5',
  clientName: 'ישראל ישראלי',
  clientPhone: '050-1234567',
  clientEmail: 'israel@example.com',
  clientAddress: 'מתחם העבודה, אזור תעשייה עמק חפר',
  date: new Date().toISOString().split('T')[0],
  status: 'quotation',
  
  contractorMarginPercent: 25,
  laborCostTotal: 8500,
  laborDays: 7,
  vatEnabled: true,
  constructionWorkHours: 40,
  constructionHourlyRate: 120,
  notes: 'ההצעה כוללת הובלה והנפה בטווח 50 ק"מ.',
  termsAndWarranty: DEFAULT_TERMS_TEXT,

  dimensions: {
    length: 6.0,
    width: 2.5,
    height: 2.6,
  },
  
  construction: {
    profileSpacingCm: 60,
    materialType: 'steel',
    profileSpec: '80x40x2',
    unitWeightKgPerMeter: 3.8,
  },

  wheels: {
    wheelType: 'swivel_brake',
    quantity: 6,
    loadCapacityPerWheelKg: 500,
    loadCapacityManual: false,
  },

  floor: {
    basePlateType: 'cement_board_18',
    topCovering: 'spc_vinyl',
    insulationType: 'eps_foam',
  },

  wallRoof: {
    panelType: 'eps_panel', // פאנל קלקר EPS לקירות
    panelThicknessMm: 50,  // 5 ס"מ
    panelTrackType: 'panel_aluminum_tracks',
    claddingExterior: 'wpc_wood_slats',
    polymerCladding: {
      type: 'plates',
      heightMode: 'full',
      customHeightCm: 120,
    },
    roofPanelType: 'eps_panel', // פאנל גג נפרד (איסכורית)
    roofOverhangCm: 40, // בלט גג 40 ס"מ מכל צד
  },

  openings: [
    {
      id: 'op_1',
      type: 'main_door',
      title: 'דלת כניסה פרופיל קליל 2000',
      widthCm: 90,
      heightCm: 200,
      quantity: 1,
      doorProfile: 'klil_2000',
      glassType: 'triplex',
      pricePerUnit: 2200,
    },
    {
      id: 'op_2',
      type: 'window',
      title: 'חלון אלומיניום קליל 7000 הזזה',
      widthCm: 100,
      heightCm: 100,
      quantity: 2,
      glassType: 'glass_4mm',
      pricePerUnit: 850,
    },
  ],

  electrical: {
    powerOutletsCount: 8,
    heavyPowerOutletsCount: 1,
    switchesCount: 4,
    lightingPointsCount: 4,
    mainPanelType: 'three_phase_32a',
    airConditioner: 'ac_15hp',
    installationType: 'hidden_in_panel',
    panelLocation: 'corner',
    feedDistanceMeters: 3,
    powerOutletAvgDistanceMeters: 4,
  },
};

