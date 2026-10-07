import { InterestModel } from '../models/interest.model';
import { InterestRow } from '../types/profile.types';

export class InterestService {
  /**
   * Retrieve all available lifestyle interests
   */
  public static async getAllInterests(): Promise<InterestRow[]> {
    return await InterestModel.findAll();
  }

  /**
   * Retrieve single interest by slug
   */
  public static async getInterestBySlug(slug: string): Promise<InterestRow | null> {
    return await InterestModel.findBySlug(slug);
  }
}

export default InterestService;
