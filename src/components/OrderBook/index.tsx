import React, { FunctionComponent, useEffect } from 'react';
import useWebSocket from "react-use-websocket";

import TitleRow from "./TitleRow";
import { Container, TableContainer } from "./styles";
import PriceLevelRow from "./PriceLevelRow";
import Spread from "../Spread";
import { useAppDispatch, useAppSelector } from '../../hooks';
import { addSells, addBuys, addBids, addExistingState, selectBuys, selectSells } from './orderbookSlice';
import { MOBILE_WIDTH, ORDERBOOK_LEVELS } from "../../constants";
import Loader from "../Loader";
import DepthVisualizer from "../DepthVisualizer";
import { PriceLevelRowContainer } from "./PriceLevelRow/styles";
import { ProductsMap } from "../../App";
import { formatNumber } from "../../helpers";

const WSS_FEED_URL: string = 'wss://ws-feed.exchange.coinbase.com';

export enum OrderType {
  BUYS,
  SELLS
}

interface OrderBookProps {
  windowWidth: number;
  productId: string;
  isFeedKilled: boolean;
}

interface Delta {
  bids: number[][];
  asks: number[][];
  buys: number[][];
  sells: number[][];
}

interface DeltaCoinbase {
  changes: any[][];
}

let curBuys: number[][] = []
let curSells: number[][] = []

const OrderBook: FunctionComponent<OrderBookProps> = ({ windowWidth, productId, isFeedKilled }) => {
  const buys: number[][] = useAppSelector(selectBuys);
  const sells: number[][] = useAppSelector(selectSells);
  const dispatch = useAppDispatch();
  const { sendJsonMessage, getWebSocket } = useWebSocket(WSS_FEED_URL, {
    onOpen: () => console.log('WebSocket connection opened.'),
    onClose: () => console.log('WebSocket connection closed.'),
    shouldReconnect: (closeEvent) => true,
    onMessage: (event: WebSocketEventMap['message']) =>  processMessages(event)
  });

  const processMessages = (event: { data: string; }) => {
    const response = JSON.parse(event.data);
    if (response.numLevels) {
      dispatch(addExistingState(response));
    } else {
      process(response);
    }
  };

  useEffect(() => {
    function connect(product: string) {
      const unSubscribeMessage = {
        "type": "unsubscribe",
        "product_ids": [
            "ETH-USD",
            "BTC-USD"
        ],
        "channels": ["level2"]
      };
      sendJsonMessage(unSubscribeMessage);

      const subscribeMessage = {
        "type": "subscribe",
        "product_ids": [
            "ETH-USD",
            "BTC-USD"
        ],
        "channels": ["level2"]
      };
      sendJsonMessage(subscribeMessage);
    }

    if (isFeedKilled) {
      getWebSocket()?.close();
    } else {
      connect(productId);
    }
  }, [isFeedKilled, productId, sendJsonMessage, getWebSocket]);

  const process = (data: DeltaCoinbase) => {
    // if (data?.bids?.length > 0) {
    //   currentBids = [...currentBids, ...data.bids];
    //   console.log("1111",currentBids)

    //   if (currentBids.length > ORDERBOOK_LEVELS) {
    //     dispatch(addBids(currentBids));
    //     currentBids = [];
    //     currentBids.length = 0;
    //   }
    // }
    // if (data?.asks?.length >= 0) {
    //   currentAsks = [...currentAsks, ...data.asks];
    //   console.log("2222",currentAsks)

    //   if (currentAsks.length > ORDERBOOK_LEVELS) {
    //     dispatch(addAsks(currentAsks));
    //     currentAsks = [];
    //     currentAsks.length = 0;
    //   }
    // }

    console.log(data);
    if (data?.changes?.length > 0) {
      
      let buys = [] as number[][], sells = [] as number[][];
      data.changes.forEach((change: any) => {
        const price = 0 + Number(change[1]);
        const size = 0 + Number(change[2]);
        if (change[0] === 'buy') {
          buys = [...buys, [price, size]];
        }
        if (change[0] === 'sell') {
          console.log(price, size);
          sells = [...sells, [price, size]];
        }
      })

      curBuys = [...curBuys, ...buys];
      if (curBuys.length > ORDERBOOK_LEVELS) {
        // dispatch(addBids(currentBids));
        dispatch(addBuys(curBuys));
        curBuys = [];
        curBuys.length = 0;
      }

      curSells = [...curSells, ...sells];
      if (curSells.length > ORDERBOOK_LEVELS) {
        dispatch(addSells(curSells));
        curSells = [];
        curSells.length = 0;
      }
    }
    
  };

  const formatPrice = (arg: number): string => {
    return arg.toLocaleString("en", { useGrouping: true, minimumFractionDigits: 2 })
  };

  const buildPriceLevels = (levels: number[][], orderType: OrderType = OrderType.BUYS): React.ReactNode => {
    const sortedLevelsByPrice: number[][] = [ ...levels ].sort(
      (currentLevel: number[], nextLevel: number[]): number => {
        let result: number = 0;
        if (orderType === OrderType.BUYS || windowWidth < MOBILE_WIDTH) {
          result = nextLevel[0] - currentLevel[0];
        } else {
          result = currentLevel[0] - nextLevel[0];
        }
        return result;
      }
    );

    return (
      sortedLevelsByPrice.map((level, idx) => {
        const calculatedTotal: number = level[2];
        const total: string = formatNumber(calculatedTotal);
        const depth = level[3];
        const size: string = formatNumber(level[1]);
        const price: string = formatPrice(level[0]);

        return (
          <PriceLevelRowContainer key={idx + depth}>
            <DepthVisualizer key={depth} windowWidth={windowWidth} depth={depth} orderType={orderType} />
            <PriceLevelRow key={size + total}
                           total={total}
                           size={size}
                           price={price}
                           reversedFieldsOrder={orderType === OrderType.ASKS}
                           windowWidth={windowWidth} />
          </PriceLevelRowContainer>
        );
      })
    );
  };

  return (
    <Container>
      {buys.length && sells.length ?
        <>
          <TableContainer>
            {windowWidth > MOBILE_WIDTH && <TitleRow windowWidth={windowWidth} reversedFieldsOrder={false} />}
            <div>{buildPriceLevels(buys, OrderType.BUYS)}</div>
          </TableContainer>
          {/* <Spread bids={bids} asks={asks} /> */}
          <TableContainer>
            <TitleRow windowWidth={windowWidth} reversedFieldsOrder={true} />
            <div>
              {buildPriceLevels(sells, OrderType.SELLS)}
            </div>
          </TableContainer>
        </> :
        <Loader />}
    </Container>
  )
};

export default OrderBook;
