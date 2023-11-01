export type FooterModel = {
    address: any;
    blocks: Array<
        | any
        | {
              title: string;
              items: {
                  title: string;
                  handle: string;
              }[];
          }
    >;
};
