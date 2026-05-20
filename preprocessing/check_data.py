import pandas as pd

df = pd.read_csv('datasets/yield/crop_production.csv')
print("Total rows:", len(df))
print("Years in dataset:", sorted(df['Crop_Year'].unique()))
print("UP rows:", len(df[df['State_Name'] == 'Uttar Pradesh']))
print("UP Wheat rows:", len(df[(df['State_Name'] == 'Uttar Pradesh') & (df['Crop'] == 'Wheat')]))
print("UP 2015 crops:", df[(df['State_Name'] == 'Uttar Pradesh') & (df['Crop_Year'] == 2015)]['Crop'].unique())
print("Crops in 2015 overall:", df[df['Crop_Year'] == 2015]['Crop'].unique())
print("Wheat rows in 2015 overall:", len(df[(df['Crop'] == 'Wheat') & (df['Crop_Year'] == 2015)]))
