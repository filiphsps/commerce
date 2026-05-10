export type FooterModel = {
    address: unknown;
    blocks: Array<
        | unknown
        | {
              title: string;
              items: {
                  title: string;
                  handle: string;
              }[];
          }
    >;
};
