import {Seat} from "./app";
import {pipe} from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as O from 'fp-ts/Option';
import { sectionData, priceArrData } from "./app"

export type Section = {
    Id: string
    Description: string
}

export type Price = {
    ZoneId: string,
    Price: number
}

type SeatEl = {
    SeatStatusId: number,
    ZoneId: string,
    SeatRow: string,
    SeatNumber: string
}


export function forSeatArr(data: Array<SeatEl>, ): Seat[] {
    return pipe(
        data,
        A.filterMap((el: SeatEl)=> el.SeatStatusId === 0 ? O.some(createSeat(el)) : O.none),
        A.compact
    );
}

function createSeat(el: SeatEl): O.Option<Seat> {
    return pipe(
        O.Do,
        O.bind('el', ()=> O.some(el)),
        O.bind('section', ({el})=> findSection(el)),
        O.bind('prices', ({el})=> O.some(findPrices(el))),
        O.map(({el, section, prices})=> ({
            row: el.SeatRow,
            seatNumber: el.SeatNumber,
            section: section.Description,
            price: {
                amount: prices.pop(),
                packageArr: prices,
            }
        }))

    )

}

function findSection(el: SeatEl): O.Option<Section> {
    return A.findFirst((item: Section) => item.Id === el.ZoneId)(sectionData);
}

function findPrices (el: SeatEl): number[] {
    return A.filterMap((item: Price)=> el.ZoneId === item.ZoneId ? O.some(item.Price) : O.none)(priceArrData);
}