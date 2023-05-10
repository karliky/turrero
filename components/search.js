import { React, useState, useRef, useEffect } from "react";
import styles from './search.module.css';

const algoliasearch = require('algoliasearch');

const client = algoliasearch('WU4KEG8DAS', '7bd2f67692c4d35a0c9a5d7e005deb1e');
const index = client.initIndex('turras');

function List(props) {
    return props.data.map((item) => (
        <div
            className={styles['search-item']}
            key={item.id} dangerouslySetInnerHTML={{ __html: item._highlightResult.tweet.value }}
            onClick={() => window.location.href = "/turra/" + item.id.split("-")[0] + "#" + item.id.split("-")[1]}
        ></div>
    ));
}

function Search() {
    const [inputText, setInputText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const resultsRef = useRef(null);
    const clearRef = useRef(null);
    const debounceRef = useRef();
    const DEBOUNCE_MIN_MS = 300;

    const onSearch = (searchValue) => {
        if (searchValue === "") {
            resultsRef.current.style.display = 'none';
            clearRef.current.style.display = 'none';
            return setSearchResults([]);
        }
        resultsRef.current.style.display = 'block';
        clearRef.current.style.display = 'block';
        index.search(searchValue).then(({ hits }) => {
            setSearchResults(hits);
        });
    };

    const onSearchDebounce = (e) => {
        var searchValue = e.target.value.toLowerCase();
        setInputText(searchValue);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = (setTimeout(() => onSearch(searchValue), DEBOUNCE_MIN_MS));
    }

    const clearSearch = () => {
        setInputText("");
        resultsRef.current.style.display = 'none';
        clearRef.current.style.display = 'none';
        setSearchResults([]);
    };

    const handleClearKey = (e) => {
        if (e.key === "Enter") {
            clearSearch();
        }
    }

    useEffect(() => {
        document.addEventListener("click", (e) => {
            document.querySelector(`.${styles.results}`).style.display = "none";
        });
      }, []);

    return (
        <div className={`${styles.search}`}>
            <div>
                <input className={`${styles['search-field']}`} type="text" value={inputText} onChange={onSearchDebounce} placeholder="Buscar turras..." />
                <div className={styles['clear-icon']} ref={clearRef} onClick={clearSearch} onKeyDown={handleClearKey} tabIndex="0">
                    <svg viewBox="0 0 14 14" className={styles['h-8']}><path d="M8.41,7l5.3-5.29A1,1,0,1,0,12.29.29L7,5.59,1.71.29A1,1,0,0,0,.29,1.71L5.59,7,.29,12.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L7,8.41l5.29,5.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>
                </div>
            </div>

            <div className={styles.results} ref={resultsRef}>
                <List input={inputText} data={searchResults} />
            </div>
        </div>
    );
}

export default Search;