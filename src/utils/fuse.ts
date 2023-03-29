// @ref: https://github.com/ensdomains/ensjs-v3/blob/feat/namewrapper-upgrade/packages/ensjs/src/utils/fuses.ts

// child named fuses
const CANNOT_UNWRAP = 1;
const CANNOT_BURN_FUSES = 2;
const CANNOT_TRANSFER = 4;
const CANNOT_SET_RESOLVER = 8;
const CANNOT_SET_TTL = 16;
const CANNOT_CREATE_SUBDOMAIN = 32;
const CANNOT_APPROVE = 64;

// parent named fuses
const PARENT_CANNOT_CONTROL = 0x10000;
const IS_DOT_ETH = 0x20000;
const CAN_EXTEND_EXPIRY = 0x40000;

// fuse ranges
export const CHILD_CONTROLLED_FUSES = 0x0000ffff;
export const PARENT_CONTROLLED_FUSES = 0xffff0000;
export const USER_SETTABLE_FUSES = 0xfffdffff;

// empty fuse
const CAN_DO_EVERYTHING = 0;

export const childFuseEnum = {
  CANNOT_UNWRAP,
  CANNOT_BURN_FUSES,
  CANNOT_TRANSFER,
  CANNOT_SET_RESOLVER,
  CANNOT_SET_TTL,
  CANNOT_CREATE_SUBDOMAIN,
  CANNOT_APPROVE,
} as const;

export const parentFuseEnum = {
  PARENT_CANNOT_CONTROL,
  CAN_EXTEND_EXPIRY,
};

export const fullParentFuseEnum = {
  ...parentFuseEnum,
  IS_DOT_ETH,
} as const;

export const userSettableFuseEnum = {
  ...childFuseEnum,
  ...parentFuseEnum,
} as const;

export const fullFuseEnum = {
  ...userSettableFuseEnum,
  CAN_DO_EVERYTHING,
};

export const unnamedChildFuses = [
  128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
] as const;

export const unnamedParentFuses = [
  0x80000, 0x100000, 0x200000, 0x400000, 0x800000, 0x1000000, 0x2000000,
  0x4000000, 0x8000000, 0x10000000, 0x20000000, 0x40000000, 0x80000000,
] as const;

export const unnamedUserSettableFuses = [
  ...unnamedChildFuses,
  ...unnamedParentFuses,
] as const;

export const childFuseKeys = Object.keys(
  childFuseEnum
) as (keyof typeof childFuseEnum)[];
export const parentFuseKeys = Object.keys(
  parentFuseEnum
) as (keyof typeof parentFuseEnum)[];
export const fullParentFuseKeys = Object.keys(
  fullParentFuseEnum
) as (keyof typeof fullParentFuseEnum)[];
export const userSettableFuseKeys = Object.keys(
  userSettableFuseEnum
) as (keyof typeof userSettableFuseEnum)[];

type FuseType<
  Enum extends Record<string, number>,
  UnnamedTuple extends readonly number[],
  CustomFuses extends string = never
> = {
  fuse: keyof Enum;
  options: { -readonly [K in keyof Enum]?: boolean };
  current: { [K in keyof Enum]: boolean } & {
    readonly [K in CustomFuses]: boolean;
  };
  unnamed: UnnamedTuple;
  unnamedValues: UnnamedTuple[number];
  unnamedObject: { [K in UnnamedTuple[number]]: boolean };
};

export type ChildFuses = FuseType<
  typeof childFuseEnum,
  typeof unnamedChildFuses,
  'CAN_DO_EVERYTHING'
>;
export type ParentFuses = FuseType<
  typeof parentFuseEnum,
  typeof unnamedParentFuses
>;
export type FullParentFuses = FuseType<
  typeof fullParentFuseEnum,
  typeof unnamedParentFuses
>;
export type UserSettableFuses = FuseType<
  typeof userSettableFuseEnum,
  typeof unnamedUserSettableFuses
>;

const decodeNamedFuses = (fuses: number, arr: readonly string[]) => {
  const fuseObj = Object.fromEntries(
    arr.map((fuse) => [
      fuse,
      (fuses &
        userSettableFuseEnum[fuse as keyof typeof userSettableFuseEnum]) >
        0,
    ])
  );

  return fuseObj;
};

const decodeUnnamedFuses = (fuses: number, arr: readonly number[]) => {
  const fuseObj = Object.fromEntries(
    arr.map((fuse) => [fuse, (fuses & fuse) > 0])
  );

  return fuseObj;
};

export const decodeFuses = (fuses: number) => {
  const parentNamedFuses = decodeNamedFuses(
    fuses,
    fullParentFuseKeys
  ) as FullParentFuses['current'];
  const parentUnnamedFuses = decodeUnnamedFuses(
    fuses,
    unnamedParentFuses
  ) as ParentFuses['unnamedObject'];

  const childNamedFuses = decodeNamedFuses(
    fuses,
    childFuseKeys
  ) as ChildFuses['current'];
  const childUnnamedFuses = decodeUnnamedFuses(
    fuses,
    unnamedChildFuses
  ) as ChildFuses['unnamedObject'];

  return {
    parent: {
      ...parentNamedFuses,
      unnamed: parentUnnamedFuses,
    },
    child: {
      ...childNamedFuses,
      CAN_DO_EVERYTHING: (fuses & CHILD_CONTROLLED_FUSES) === 0,
      unnamed: childUnnamedFuses,
    },
  };
};

type PartialFuseSet = {
  parent: FullParentFuses['current'];
  child: ChildFuses['current'];
};

export const WrapperState = Object.freeze({
  LOCKED: 'Locked',
  EMANCIPATED: 'Emancipated',
  WRAPPED: 'Wrapped',
});

export type WrapperState = typeof WrapperState[keyof typeof WrapperState];

export function getWrapperState(fuses: PartialFuseSet): WrapperState {
  if (fuses.parent.PARENT_CANNOT_CONTROL) {
    if (fuses.child.CANNOT_UNWRAP) return WrapperState.LOCKED;
    return WrapperState.EMANCIPATED;
  }
  return WrapperState.WRAPPED;
}
