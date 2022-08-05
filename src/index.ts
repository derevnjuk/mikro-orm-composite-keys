import {
  Cascade,
  Collection,
  Entity,
  EntityData,
  IdentifiedReference,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  PrimaryKeyProp,
  PrimaryKeyType
} from '@mikro-orm/core';
import {PostgreSqlDriver} from '@mikro-orm/postgresql';
import {v4} from 'uuid';

@Entity()
export class Group {
  @PrimaryKey({columnType: 'uuid', defaultRaw: `uuid_generate_v4()`})
  public id: string = v4();

  @OneToMany({
    entity: () => GroupMember,
    mappedBy: (member) => member.group
  })
  public members = new Collection<GroupMember>(this);


  constructor(params: EntityData<Group>) {
    Object.assign(this, params);
  }
}

@Entity()
export class GroupMember {
  @ManyToOne({
    entity: () => Member,
    inversedBy: (member) => member.groups,
    primary: true,
    wrappedReference: true,
  })
  public member: IdentifiedReference<Member>;

  @ManyToOne({
    entity: () => Group,
    inversedBy: (group) => group.members,
    primary: true,
    wrappedReference: true,
  })
  public group: IdentifiedReference<Group>;

  public [PrimaryKeyType]!: [string, string];
  public [PrimaryKeyProp]!: 'member' | 'group';

  constructor(params: EntityData<GroupMember>) {
    Object.assign(this, params);
  }
}

@Entity()
export class Member {
  @PrimaryKey({columnType: 'uuid', defaultRaw: `uuid_generate_v4()`})
  public id: string = v4();

  @OneToMany({
    entity: () => GroupMember,
    mappedBy: (group) => group.member,
    cascade: [Cascade.ALL],
    orphanRemoval: true
  })
  public groups = new Collection<GroupMember>(this);

  constructor(params: EntityData<Member>) {
    Object.assign(this, params);
  }
}

const entrypoint = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>({
    entities: [Group, Member, GroupMember],
    contextName: 'pg',
    debug: true,
    clientUrl: 'postgresql://user:password@localhost:5432/test',
    type: 'postgresql',
    allowGlobalContext: true
  });
  const {em} = orm;

  // Cleanup DBs
  const clean = async (dispose: boolean = false): Promise<void> => {
    await em.nativeDelete(GroupMember, {});
    await em.nativeDelete(Member, {});
    await em.nativeDelete(Group, {});

    if (dispose) {
      await orm.close();
    }
  };

  try {
    await clean();

    const group1 = new Group({});
    const group2 = new Group({});
    const member = new Member({});

    await orm.em.persistAndFlush([group1, group2, member]);

    // adding a row to the pivot table
    orm.em.assign(member, {
      groups: [
        {
          group: group1.id,
          member: member.id,
        }
      ]
    });

    await orm.em.persistAndFlush(member);
    // insert into "group_member" ("group_id", "member_id") values ('ac350214-a56a-428b-9fca-1ebbaac52de0', '8098f164-9057-4721-8af9-195c7b76c0f6')

    // adding a new row to the pivot table
    orm.em.assign(member, {
      groups: [
        {
          group: group1.id,
          member: member.id,
        },
        {
          group: group2.id,
          member: member.id,
        }
      ]
    });

    await orm.em.persistAndFlush(member);
    // insert into "group_member" ("group_id", "member_id") values ('00e2725e-4aa4-4711-b1dd-fe7503d240aa', '8098f164-9057-4721-8af9-195c7b76c0f6')

    // removing a row from the pivot table
    orm.em.assign(member, {
      groups: [
        {
          group: group1.id,
          member: member.id,
        }
      ]
    });

    await orm.em.persistAndFlush(member);
    // delete from "group_member" where ("group_id", "member_id") = ('00e2725e-4aa4-4711-b1dd-fe7503d240aa', '8098f164-9057-4721-8af9-195c7b76c0f6')

    console.log(await orm.em.findOne(Member, member.id))
  } catch (e) {
    console.log(e);
  } finally {
    await clean(true);
  }
};

entrypoint();
