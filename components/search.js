
// const algoliaClient = algoliasearch('WU4KEG8DAS', '7bd2f67692c4d35a0c9a5d7e005deb1e');
import React from "react";
import algoliasearch from "algoliasearch/lite";
import { SearchBox } from 'react-instantsearch-hooks-web';
import {
    InstantSearch,
    Hits,
    Highlight
} from "react-instantsearch-hooks-web";


function Hit({ hit }) {
    return (
        <article>
            <Highlight attribute="tweet" hit={hit} />
        </article>
    );
}

let firstLoad = true;

const defaultEmptyResponse = {
    hits: [],
    nbHits: 0,
    nbPages: 0,
    page: 0,
    processingTimeMS: 0,
    hitsPerPage: 0,
    exhaustiveNbHits: false,
    query: '',
    params: '',
};

const searchClient = {
    ...algoliaClient,
    search(requests) {
        if (firstLoad) {
            firstLoad = false;
            return Promise.resolve({
                results: requests.map(() => (defaultEmptyResponse)),
            });
        }

        return algoliaClient.search(requests);
    },
};

export default function Search() {
    return (
        <InstantSearch indexName="turras" searchClient={searchClient} >
            <SearchBox />
            <Hits hitComponent={Hit} />
        </InstantSearch>
    );
}