import express, {NextFunction, Request, Response} from 'express';
import axios from "axios";
import {pipe} from "fp-ts/function";
import * as E from 'fp-ts/Either';
const app = express();

app.get('/:id', getAvailableSeats);

app.listen(3000, ()=> {
    console.log('Server started');
});
export interface Seat {
    row: string,
    seatNumber: string,
    section: string,
    price: {
        packageArr: number[],
        amount: number
    }
}

export interface Id {
    _tag: 'Id',
    value: number | string
}
async function getAvailableSeats(req: Request, res: Response, next: NextFunction) {
    const pipeline = pipe(
        req.params.id,
        of,
        validate,

    );
    if(pipeline._tag === 'Left') {
       return res.status(404).send(pipeline.left);
    }
    const resSectionArrData = await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/PriceTypes/Details?modeOfSaleId=26&packageId=${pipeline.right.value}&sourceId=6259`);
    if(resSectionArrData.data.length === 0) {
        return res.status(404).send('Performance with this Id not found');
    }
    const sectionData = resSectionArrData.data[0].Zones;
    const urlSeatsData = await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/Packages/${pipeline.right.value}/Seats?constituentId=0&modeOfSaleId=26&packageId=${pipeline.right.value}`);

    const priceArrData = await axios.get(`https://my.laphil.com/en/rest-proxy/TXN/Packages/${pipeline.right.value}/Prices?expandPerformancePriceType=&includeOnlyBasePrice=&modeOfSaleId=26&priceTypeId=&sourceId=6259`);
    const resArr = [];
    for(let el of urlSeatsData.data) {
        if(el.SeatStatusId === 6) { //Seats locked now
            break;
        }
        if(el.SeatStatusId === 0 && el.IsSeat === true) { //Seats available
            const section = sectionData.find((item: any)=> item.Id === el.ZoneId);
            const priceArr = [];
            for(let i of priceArrData.data) {
                if(el.ZoneId === i.ZoneId) {
                    priceArr.push(i.Price);
                }
            }
            const amountPrice = priceArr.pop();
            const newSeat: Seat = {
                row: el.SeatRow,
                seatNumber: el.SeatNumber,
                section: section.Description,
                price: {
                    packageArr: priceArr,
                    amount: amountPrice
                }
            }
            resArr.push(newSeat);
        }
    }
    res.json(resArr);
}

function of(value: number | string): Id {
    return {
        _tag: 'Id',
        value: value
    }
}

function validate(id: Id): E.Either<string, Id> {
    if(/^\d+$/.test(id.value as string)) {
        return E.right(id);
    } else {
        return E.left('Wrong Id')
    }
}
