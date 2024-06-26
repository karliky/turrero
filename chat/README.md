# Install

First install python and chromadb, as well as project dependencies.

```bash
pip install chromadb 
```

Then install the notebook

```bash
npm -g tslab
pip install juypterlab
jupyter kernelspec list|grep tslab
tslab install --python=python3
```


# Run 
```
chroma run --path db
jupyter lab 
```


# Troubleshooting

If there is a bug with chroma that says `Chroma getOrCreateCollection error: Error: AttributeError("type object 'CreateCollection' has no attribute 'model_validate'"`, upgrade pydantic:

```bash
pip install pydantic --upgrade
```