import { Visibility } from 'src/common/enums/visibility.enum';

export interface SongType {
  id: number;
  title: string;
  artist?: string;
  ownerId: number;
  visibility: Visibility;
  tempo?: number;
  key?: string;
  capo?: number;
  timeSigTop?: number;
  timeSigBot?: number;
  createdAt: Date;
  updatedAt: Date;
}
