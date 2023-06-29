import express, {NextFunction, Request, Response} from 'express';
import axios from "axios";
import {pipe} from "fp-ts/function";
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import {forSeatArr, Section, Price} from "./create.seat";

(()=> {
    const app = express();

    app.get('/:id', getAvailableSeats);

    app.listen(3000, ()=> {
        console.log('Server started');
    });
})()

export let sectionData: Array<Section>;
export let priceArrData: Array<Price>;

export interface Seat {
    row: string,
    seatNumber: string,
    section: string,
    price: {
        packageArr: number[],
        amount?: number
    }
}

export interface Id {
    _tag: 'Id',
    value: string
}

export type WrongIdType = {
    _tag: 'WrongIdType',
    message: string
}

export type IdNotFoundType = {
    _tag: 'IdNotFoundType',
    message: string
}
async function getAvailableSeats(req: Request, res: Response, next: NextFunction) {
    const performanceId: WrongIdType | Id = pipeValidateId(req.params.id)
    if(performanceId._tag === 'WrongIdType') {
        return res.status(404).send(performanceId.message)
    }
    const ok = await pipeExistsPerformance(performanceId);
    if(typeof ok === 'string') {
        return res.status(404).send('Performance with this Id not found');
    }

    await pipeGetPriceData(performanceId);
    const resultArr = await pipeGetSeatData(performanceId);
    console.log(resultArr.length);
    res.json(resultArr);
}

function of(value: string): Id {
    return {
        _tag: 'Id',
        value: value
    }
}

function validate(id: Id): E.Either<WrongIdType, Id> {
    if(/^\d+$/.test(id.value as string)) {
        return E.right(id);
    } else {
        return E.left({_tag: 'WrongIdType', message: 'Wrong Id'})
    }
}

function pipeValidateId(id: string): WrongIdType | Id {
    return pipe(
        id,
        of,
        validate,
        E.matchW(
            (e: WrongIdType)=> e,
            (id: Id)=> id
        )
    );
}

async function pipeExistsPerformance(performanceId: Id): Promise<string | Section[]> {
    return pipe(
        await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/PriceTypes/Details?modeOfSaleId=26&packageId=${performanceId.value}&sourceId=6259`),
        O.fromPredicate(
            (a)=> a.data.length !== 0
        ),
        O.matchW(
            ()=> 'Performance with this Id not found',
            (a)=> {
                sectionData = a.data[0].Zones;
                return sectionData;
            }
        ),
    )
}

async function pipeGetPriceData(performanceId: Id): Promise<boolean> {
    return pipe(
        O.some(await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/Packages/${performanceId.value}/Prices?expandPerformancePriceType=&includeOnlyBasePrice=&modeOfSaleId=26&priceTypeId=&sourceId=6259`)),
        O.map(
            (a)=>a.data
        ),
        O.match(
            ()=> false,
            (a)=> {
                priceArrData = a
                return true
            }
        )
    )
}

async function pipeGetSeatData(performanceId: Id) {
    return pipe(
        O.some(await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/Packages/${performanceId.value}/Seats?constituentId=0&modeOfSaleId=26&packageId=${performanceId.value}`)),
        O.map((
            (a)=> a.data
        )),
        O.match(
            ()=> true,
            (a)=> a
        ),
        forSeatArr
    )
}

