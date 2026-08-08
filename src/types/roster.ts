export interface RosterPlayer {
  id: number;
  headshot: string;
  firstName: { default: string };
  lastName: { default: string };
  sweaterNumber: number;
  positionCode: string;
  shootsCatches: string;
  heightInInches: number;
  weightInPounds: number;
  heightInCentimeters: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: { default: string };
  birthCountry: string;
  birthStateProvince?: { default: string };
}

export interface RosterResponse {
  forwards: RosterPlayer[];
  defensemen: RosterPlayer[];
  goalies: RosterPlayer[];
}
