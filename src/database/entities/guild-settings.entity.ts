import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'guild_settings' })
export class GuildSettingsEntity {
  @PrimaryColumn({ name: 'guild_id', type: 'text' })
  public guildId!: string;

  @Column({ name: 'welcome_channel_id', type: 'text', nullable: true })
  public welcomeChannelId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  public updatedAt!: Date;
}
